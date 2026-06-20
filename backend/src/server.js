import { logger } from "./utils/logger.js";
import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createSocketServer } from "./sockets/index.js";
import { startSlaMonitor } from "./services/slaService.js";
import { startCronJobs } from "./services/cronService.js";

async function bootstrap() {
  try {
    await connectDatabase();
    logger.log("Database connected");

    const app = createApp();
    const server = http.createServer(app);

    createSocketServer(server);
    logger.log("Socket server initialized");

    startSlaMonitor();
    logger.log("SLA monitor initialized");

    const { startStockWatcher } = await import("./services/stockWatcher.js");
    startStockWatcher();
    logger.log("Stock watcher initialized");

    startCronJobs();
    logger.log("Cron jobs scheduled");

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${env.port} is already in use`);
        process.exit(1);
      }
      console.error("Server error:", error);
      throw error;
    });

    server.listen(env.port, () => {
      logger.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
