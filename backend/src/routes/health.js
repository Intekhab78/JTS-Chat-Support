import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date(),
    uptime: `${Math.floor(uptime)}s`,
    database: {
      status: dbStatus
    },
    system: {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
      }
    }
  });
});

export default router;
