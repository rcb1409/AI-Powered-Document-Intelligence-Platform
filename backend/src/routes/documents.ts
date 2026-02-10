import { Router, Request, Response } from "express";
import { upload } from "../middleware/upload";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { saveMulterFile } from "../config/storage";
import { extractTextFromPDF } from "../services/pdfService";
import { chunkText } from "../utils/textChunker";
import { generateEmbeddings } from "../config/embeddings";
import {
  createDocument,
  saveDocumentChunks,
  getUserDocuments,
  deleteDocument,
} from "../services/documentService";

const router = Router();

/**
 * POST /api/documents/upload
 * 
 * Flow:
 * 1) Receive PDF file via multipart/form-data (field name: "file")
 * 2) Save file to local storage (uploads/)
 * 3) Extract text from PDF
 * 4) Chunk the text
 * 5) Generate embeddings for each chunk
 * 6) Save document + chunks (with embeddings) to the database
 */
router.post(
  "/upload",
  authMiddleware,          // require JWT
  upload.single("file"),   // Multer middleware: req.file will be set
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 1) Ensure file is present
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      // Get user id from auth middleware
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // 2) Save file to disk (returns URL path & metadata)
      const stored = saveMulterFile(req.file);
      console.log("Saved file to:", stored.urlPath);

      // 3) Extract text from PDF bytes
      const text = await extractTextFromPDF(req.file.buffer);
      console.log("Extracted text length:", text.length);

      if (!text.trim()) {
        return res.status(400).json({
          success: false,
          error: "No text could be extracted from the PDF",
        });
      }

      // 4) Chunk the text
      const chunks = chunkText(text, {
        maxChars: 1000,
        overlapChars: 200,
      });
      console.log("Chunk count:", chunks.length);

      if (chunks.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Text could not be chunked into non-empty segments",
        });
      }

      // 5) Generate embeddings for each chunk (Hugging Face)
      console.log("Generating embeddings for chunks...");
      const embeddings = await generateEmbeddings(chunks);
      console.log("Embeddings generated for", embeddings.length, "chunks");

      // Safety: ensure counts match
      if (embeddings.length !== chunks.length) {
        return res.status(500).json({
          success: false,
          error: "Embedding count does not match chunk count",
        });
      }

      // 6) Save document metadata to DB
      const doc = await createDocument(
        userId,
        req.file.originalname,
        stored.urlPath,
        req.file.size
      );
      console.log("Created document with id:", doc.id);

      // 7) Save chunks + embeddings to DB
      const chunksSaved = await saveDocumentChunks(doc.id, chunks, embeddings);
      console.log("Saved", chunksSaved, "chunks for document", doc.id);

      // 8) Respond to client
      return res.json({
        success: true,
        documentId: doc.id,
        filename: doc.filename,
        fileUrl: doc.file_url,
        chunksCount: chunksSaved,
        message: "Document uploaded and processed successfully",
      });
    } catch (error: any) {
      console.error("Error in /api/documents/upload:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to process document",
      });
    }
  }
);

/**
 * GET /api/documents
 * List documents for the current user
 */
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const documents = await getUserDocuments(userId);

    return res.json({
      success: true,
      documents,
    });
  } catch (error: any) {
    console.error("Error in GET /api/documents:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch documents",
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document and its chunks (and chat_history via CASCADE)
 */
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const documentId = Number(req.params.id);

    if (!documentId || Number.isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document id",
      });
    }

    await deleteDocument(documentId, userId);

    return res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/documents/:id:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to delete document",
    });
  }
});

export default router;