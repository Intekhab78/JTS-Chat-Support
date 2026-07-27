import { Router } from "express";
import mongoose from "mongoose";
import os from "os";

const router = Router();

router.get("/", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : "disconnected";
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpus = os.cpus();

  let collectionsCount = 0;
  try {
    if (dbState === 1) {
      const collections = await mongoose.connection.db.collections();
      collectionsCount = collections.length;
    }
  } catch (err) {
    console.error("[Health Monitor] Failed to fetch collection count:", err.message);
  }

  res.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    database: {
      status: dbStatus,
      collections: collectionsCount,
      host: mongoose.connection.host || "localhost"
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpuCores: cpus.length,
      memory: {
        totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMemMb: Math.round(os.freemem() / 1024 / 1024),
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      }
    },
    services: {
      scheduler: "active",
      notifications: "active",
      auditLogger: "active"
    }
  });
});

export default router;
