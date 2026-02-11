import { Router, Response } from "express";
import pool from "../config/database";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/workspaces
 * List workspaces for current user
 */
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const result = await pool.query(
        `SELECT 
           w.id, 
           w.name, 
           w.created_at,
           COUNT(DISTINCT d.id)::int as document_count,
           COUNT(DISTINCT ch.id)::int as chat_count
         FROM workspaces w
         LEFT JOIN documents d ON d.workspace_id = w.id AND d.user_id = w.user_id
         LEFT JOIN chat_history ch ON ch.workspace_id = w.id AND ch.user_id = w.user_id
         WHERE w.user_id = $1
         GROUP BY w.id, w.name, w.created_at
         ORDER BY w.created_at DESC`,
        [userId]
      );

    return res.json({ success: true, workspaces: result.rows });
  } catch (error: any) {
    console.error("Error in GET /api/workspaces:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch workspaces",
    });
  }
});

/**
 * POST /api/workspaces
 * Body: { name: string }
 */
router.post("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "name is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO workspaces (user_id, name)
       VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [userId, name.trim()]
    );

    return res.status(201).json({
      success: true,
      workspace: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error in POST /api/workspaces:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to create workspace",
    });
  }
});

/**
 * DELETE /api/workspaces/:workspaceId
 */
router.delete("/:workspaceId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

    // Ensure workspace belongs to user
    const check = await pool.query(
      `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Workspace not found",
      });
    }

    await pool.query(
      `DELETE FROM workspaces WHERE id = $1`,
      [workspaceId]
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/workspaces/:workspaceId:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to delete workspace",
    });
  }
});

export default router;