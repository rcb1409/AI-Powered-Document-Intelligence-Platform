import { Router, Request, Response } from "express";
import {
  hashPassword,
  comparePassword,
  generateToken,
  findUserByEmail,
  createLocalUser,
} from "../services/authService";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const user = await createLocalUser(email, passwordHash);
    const token = generateToken(user.id);

    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (error: any) {
    console.error("Error in /auth/register:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (error: any) {
    console.error("Error in /auth/login:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Login failed" });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // For MVP, just return userId; later you can fetch full user
    return res.json({
      success: true,
      user: { id: req.userId },
    });
  } catch (error: any) {
    console.error("Error in /auth/me:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Failed to fetch user" });
  }
});

export default router;