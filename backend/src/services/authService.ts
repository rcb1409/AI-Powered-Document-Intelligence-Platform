import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";
const JWT_EXPIRES_IN = "7d";

export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(userId: number): string {
    return jwt.sign({userId}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
}

export function verifyToken(token: string): { userId: number } {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
}

export async function findUserByEmail(email: string) {
    const result = await pool.query(
      `SELECT id, email, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  export async function createLocalUser(
    email: string,
    passwordHash: string
  ) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );
  
    return result.rows[0];
  }  



