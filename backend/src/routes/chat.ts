import { Router, Request, Response } from "express";
import { generateEmbedding } from "../config/embeddings";
import { getTopChunksForQuestion } from "../services/documentService";
import { answerQuestion } from "../services/aiService";
import pool from "../config/database";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/**
 * POST /api/chat/ask
 * 
 * Ask a question about a document using RAG.
 * 
 * Request body: { documentId: number, question: string }
 * Response: { answer: string, relevantChunks: string[] }
 */
router.post("/ask", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId, question } = req.body;

    // Validate input
    if (!documentId || !question) {
      return res.status(400).json({
        success: false,
        error: "documentId and question are required",
      });
    }

    if (typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "question must be a non-empty string",
      });
    }

    // Get user id from auth middleware
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Step 1: Generate embedding for the question
    console.log("Generating question embedding...");
    const questionEmbedding = await generateEmbedding(question.trim());
    console.log("Question embedding generated, dimensions:", questionEmbedding.length);

    // Step 2: Find most similar chunks using vector search
    console.log("Searching for similar chunks...");
    const relevantChunks = await getTopChunksForQuestion(
      documentId,
      questionEmbedding,
      5 // Get top 5 most similar chunks
    );
    console.log("Found", relevantChunks.length, "relevant chunks");

    if (relevantChunks.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No relevant content found in the document for this question",
      });
    }

    // Step 3: Generate answer using RAG (question + context chunks)
    console.log("Generating answer with Groq...");
    const answer = await answerQuestion(question, relevantChunks);
    console.log("Answer generated");

    // Step 4: Save to chat history
    await pool.query(
      `INSERT INTO chat_history (user_id, document_id, question, answer)
       VALUES ($1, $2, $3, $4)`,
      [userId, documentId, question, answer]
    );

    // Step 5: Return response
    return res.json({
      success: true,
      answer,
      relevantChunks: relevantChunks.slice(0, 3), // Return first 3 chunks for reference
      documentId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/chat/ask:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process question",
    });
  }
});

/**
 * GET /api/chat/:documentId
 * Get chat history for a specific document
 */
router.get("/:documentId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    const documentId = Number(req.params.documentId);

    if (!documentId || Number.isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid document id",
      });
    }

    const result = await pool.query(
      `SELECT id, question, answer, created_at
       FROM chat_history
       WHERE user_id = $1 AND document_id = $2
       ORDER BY created_at DESC`,
      [userId, documentId]
    );

    return res.json({
      success: true,
      history: result.rows,
    });
  } catch (error: any) {
    console.error("Error in GET /api/chat/:documentId:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch chat history",
    });
  }
});

export default router;