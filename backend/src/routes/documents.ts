import { Router, Request, Response } from "express";
import { upload } from "../middleware/upload";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { saveMulterFile } from "../config/storage";
import { extractTextFromPDF } from "../services/pdfService";
import { chunkText } from "../utils/textChunker";
import { generateEmbeddings } from "../config/embeddings";
import {
  createDocumentInWorkspace,
  saveDocumentChunks,
  getWorkspaceDocuments,
  deleteDocumentFromWorkspace,
} from "../services/documentService";

const router = Router();

/**
 * GET /api/documents/workspace/:workspaceId
 * List documents in a workspace
 */
router.get(
  "/workspace/:workspaceId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const workspaceId = Number(req.params.workspaceId);
      if (!workspaceId || Number.isNaN(workspaceId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid workspace id",
        });
      }

      const documents = await getWorkspaceDocuments(userId, workspaceId);

      return res.json({ success: true, documents });
    } catch (error: any) {
      console.error("Error in GET /api/documents/workspace/:workspaceId:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to fetch documents",
      });
    }
  }
);

/**
 * POST /api/documents/workspace/:workspaceId/upload
 * 
 * Upload document into a workspace.
 * Flow:
 * 1) Receive PDF file via multipart/form-data (field name: "file")
 * 2) Save file to local storage (uploads/)
 * 3) Extract text from PDF
 * 4) Chunk the text
 * 5) Generate embeddings for each chunk
 * 6) Save document + chunks (with embeddings) to the database
 */
router.post(
  "/workspace/:workspaceId/upload",
  authMiddleware,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const workspaceId = Number(req.params.workspaceId);
      if (!workspaceId || Number.isNaN(workspaceId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid workspace id",
        });
      }

      // Save file
      const stored = saveMulterFile(req.file);
      console.log("Saved file to:", stored.urlPath);

      // Extract text
      const text = await extractTextFromPDF(req.file.buffer);
      console.log("Extracted text length:", text.length);

      if (!text.trim()) {
        return res.status(400).json({
          success: false,
          error: "No text could be extracted from the PDF",
        });
      }

      // Chunk
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

      // Generate embeddings
      console.log("Generating embeddings for chunks...");
      const embeddings = await generateEmbeddings(chunks);
      console.log("Embeddings generated for", embeddings.length, "chunks");

      if (embeddings.length !== chunks.length) {
        return res.status(500).json({
          success: false,
          error: "Embedding count does not match chunk count",
        });
      }

      // Create document in workspace (service handles workspace validation)
      const doc = await createDocumentInWorkspace(
        userId,
        workspaceId,
        req.file.originalname,
        stored.urlPath,
        req.file.size
      );
      console.log("Created document with id:", doc.id);

      // Save chunks
      const chunksSaved = await saveDocumentChunks(doc.id, chunks, embeddings);
      console.log("Saved", chunksSaved, "chunks for document", doc.id);

      return res.json({
        success: true,
        documentId: doc.id,
        filename: doc.filename,
        fileUrl: doc.file_url,
        chunksCount: chunksSaved,
        message: "Document uploaded and processed successfully",
      });
    } catch (error: any) {
      console.error("Error in POST /api/documents/workspace/:workspaceId/upload:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to process document",
      });
    }
  }
);

/**
 * DELETE /api/documents/workspace/:workspaceId/:documentId
 * Delete document from workspace
 */
router.delete(
  "/workspace/:workspaceId/:documentId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const workspaceId = Number(req.params.workspaceId);
      const documentId = Number(req.params.documentId);

      if (!workspaceId || Number.isNaN(workspaceId) ||
          !documentId || Number.isNaN(documentId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid workspace or document id",
        });
      }

      await deleteDocumentFromWorkspace(documentId, userId, workspaceId);

      return res.json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error: any) {
      console.error("Error in DELETE /api/documents/workspace/:workspaceId/:documentId:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to delete document",
      });
    }
  }
);

export default router;