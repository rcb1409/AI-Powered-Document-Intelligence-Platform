import { Router, Request, Response } from "express";
import { generateEmbedding } from "../config/embeddings";
import { getTopChunksForWorkspaceQuestion } from "../services/documentService";
import { answerQuestion } from "../services/aiService";
import pool from "../config/database";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/**
 * POST /api/chat/workspace/ask
 * 
 * Ask a question about documents in a workspace using RAG.
 * 
 * Request body: { workspaceId: number, question: string }
 * Response: { answer: string, relevantChunks: string[] }
 */
router.post("/workspace/ask", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, question } = req.body;

    // Validate input
    if (!workspaceId || !question) {
      return res.status(400).json({
        success: false,
        error: "workspaceId and question are required",
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

    // Step 2: Find most similar chunks using vector search across workspace
    console.log("Searching for similar chunks in workspace...");
    const relevantChunks = await getTopChunksForWorkspaceQuestion(
      workspaceId,
      userId,
      questionEmbedding,
      5 // Get top 5 most similar chunks
    );
    console.log("Found", relevantChunks.length, "relevant chunks");

    if (relevantChunks.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No relevant content found in the workspace for this question",
      });
    }

    // Step 3: Generate answer using RAG (question + context chunks)
    console.log("Generating answer with Groq...");
    const answer = await answerQuestion(question, relevantChunks);
    console.log("Answer generated");

    // Step 4: Save to chat history (linked to workspace, not document)
    await pool.query(
      `INSERT INTO chat_history (user_id, workspace_id, question, answer)
       VALUES ($1, $2, $3, $4)`,
      [userId, workspaceId, question, answer]
    );

    // Step 5: Return response
    return res.json({
      success: true,
      answer,
      relevantChunks: relevantChunks.slice(0, 3), // Return first 3 chunks for reference
      workspaceId,
    });
  } catch (error: any) {
    console.error("Error in POST /api/chat/workspace/ask:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process question",
    });
  }
});

/**
 * GET /api/chat/workspace/:workspaceId
 * Get chat history for a specific workspace
 */
router.get("/workspace/:workspaceId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

    // Verify workspace belongs to user
    const wsCheck = await pool.query(
      `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    if (wsCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Workspace not found",
      });
    }

    const result = await pool.query(
      `SELECT id, question, answer, created_at
       FROM chat_history
       WHERE user_id = $1 AND workspace_id = $2
       ORDER BY created_at DESC`,
      [userId, workspaceId]
    );

    return res.json({
      success: true,
      history: result.rows,
    });
  } catch (error: any) {
    console.error("Error in GET /api/chat/workspace/:workspaceId:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch chat history",
    });
  }
});

export default router;