import app from "./app";
import { logger } from "./lib/logger";
import { connectToDatabase, isDatabaseConnected } from "@workspace/db";

const port = Number(process.env["PORT"]) || 3000;

async function startServer() {
  // In production, ensure database is available before starting
  if (process.env.NODE_ENV === "production") {
    if (!process.env.MONGODB_URI) {
      logger.error("MONGODB_URI environment variable is required in production");
      process.exit(1);
    }
    
    try {
      await connectToDatabase();
      if (!isDatabaseConnected()) {
        logger.error("Failed to connect to database - exiting");
        process.exit(1);
      }
    } catch (error) {
      logger.error({ err: error }, "Database connection failed - exiting");
      process.exit(1);
    }
  } else {
    // Development: start server immediately, DB connects in background
    connectToDatabase().catch(err => {
      logger.error({ err }, "MongoDB connection failed - routes requiring DB will use in-memory fallback");
    });
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port, dbConnected: isDatabaseConnected() }, "Server listening on 0.0.0.0");
  });
}

startServer().catch(err => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
