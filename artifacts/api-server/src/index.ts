import app from "./app";
import { logger } from "./lib/logger";
import { connectToDatabase } from "@workspace/db";

const port = Number(process.env["PORT"]) || 3000;

// Start server immediately — DB connection happens in background
app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening on 0.0.0.0");
});

// Attempt DB connection separately — failure won't kill the server
connectToDatabase().catch(err => {
  logger.error({ err }, "MongoDB connection failed — routes requiring DB will return 503");
});
