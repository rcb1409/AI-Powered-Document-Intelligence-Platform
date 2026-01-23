import dotenv from "dotenv";
dotenv.config();
import { testConnection, initPgVector } from "./config/database";

import app from "./app";

const PORT = process.env.PORT || 3000;
const startServer = async () => {
    await testConnection();
    await initPgVector();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};
startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

