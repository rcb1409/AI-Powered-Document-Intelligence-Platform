import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

export const testConnection = async (): Promise<boolean> => {
    try{
        const result = await pool.query("SELECT NOW()");
        console.log("Database connection successful", result.rows[0].now);
        return true;
    } catch (error) {
        console.error("Database connection failed", error);
        return false;
    }
}

export const initPgVector = async (): Promise<void> => {
    try{
        const result = await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
        console.log("pgVector extension created", result.rows[0].now);
    } catch (error) {
        console.error("pgVector extension creation failed", error);
    }
}

export default pool;