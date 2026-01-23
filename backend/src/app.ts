import express from "express";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./config/database";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({status: "ok"})
});

app.get("/health/db", async (req, res) => {
    const isConnected = await testConnection();
    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? "connected" : "disconnected",
        database: isConnected ? "ok" : "error"
    })
});

export default app;
