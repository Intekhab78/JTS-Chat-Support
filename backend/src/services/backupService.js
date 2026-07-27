import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const BACKUP_DIR = process.env.BACKUP_STORAGE_DIR || path.join(process.cwd(), "backups");

/**
 * Enterprise Automated Backup & Disaster Recovery Engine
 */
export async function runDatabaseBackup(options = {}) {
  const { type = "daily" } = options;
  console.log(`[Backup Engine] Starting automated ${type} database & metadata snapshot backup...`);

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `jts_backup_${type}_${timestamp}.json`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    const collections = await mongoose.connection.db.collections();
    const backupData = {
      timestamp: new Date().toISOString(),
      type,
      version: "2026.1",
      collectionsData: {}
    };

    for (const collection of collections) {
      const name = collection.collectionName;
      const docs = await collection.find({}).limit(5000).toArray();
      backupData.collectionsData[name] = docs;
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

    const stats = fs.statSync(backupFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`[Backup Engine] ✅ Backup completed cleanly: ${backupFileName} (${sizeMb} MB)`);
    cleanupExpiredBackups();

    return {
      success: true,
      backupFileName,
      sizeMb,
      timestamp: backupData.timestamp
    };
  } catch (error) {
    console.error("[Backup Engine] ❌ Backup failed:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Clean expired backups older than 30 days
 */
export function cleanupExpiredBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

    files.forEach(file => {
      if (file.startsWith("jts_backup_")) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          console.log(`[Backup Retention] Removed expired backup snapshot: ${file}`);
        }
      }
    });
  } catch (err) {
    console.error("[Backup Retention] Retention cleanup error:", err.message);
  }
}
