"use server";

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";
import { ActionResult } from "./auth";

export interface BackupFileInfo {
  fileName: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export async function updateSystemSettingsAction(
  settings: Record<string, string>
): Promise<ActionResult> {
  const actor = await requirePermission("settings.manage");

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "SETTINGS_UPDATE",
    entity: "SystemSetting",
    summary: "Memperbarui konfigurasi instansi dan surat dinas",
    details: settings,
  });

  return { success: true, message: "Pengaturan berhasil diperbarui." };
}

export async function triggerBackupAction(): Promise<
  ActionResult<{ backupFileName: string }>
> {
  const actor = await requirePermission("settings.manage");

  const dataDir = path.resolve(process.cwd(), "data");
  const backupDir = path.join(dataDir, "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const dbUrl = process.env.DATABASE_URL || "";

  let backupFileName = "";

  if (dbUrl.startsWith("mysql:")) {
    backupFileName = `cermat-${timestamp}.sql`;
    const targetBackupPath = path.join(backupDir, backupFileName);

    const mysqldumpCandidates = [
      "mysqldump",
      "C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe",
      "C:\\xampp\\mysql\\bin\\mysqldump.exe",
    ];

    let dumpBin = "mysqldump";
    for (const c of mysqldumpCandidates) {
      if (fs.existsSync(c)) {
        dumpBin = `"${c}"`;
        break;
      }
    }

    try {
      const { execSync } = await import("child_process");
      execSync(`${dumpBin} -u root --databases cermat > "${targetBackupPath}"`, {
        shell: "cmd.exe",
      });
    } catch (err) {
      console.error("Gagal backup MySQL:", err);
      return {
        success: false,
        message: "Gagal membuat cadangan database MySQL via mysqldump.",
      };
    }
  } else {
    const sourceDbPath = path.join(dataDir, "cermat.db");
    if (!fs.existsSync(sourceDbPath)) {
      return {
        success: false,
        message: "File database aktif belum ditemukan.",
      };
    }
    backupFileName = `cermat-${timestamp}.db`;
    const targetBackupPath = path.join(backupDir, backupFileName);
    fs.copyFileSync(sourceDbPath, targetBackupPath);
  }

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "DB_BACKUP",
    entity: "System",
    summary: `Membuat cadangan database: ${backupFileName}`,
    details: { backupFileName },
  });

  return {
    success: true,
    data: { backupFileName },
    message: `Database berhasil dicadangkan ke ./data/backup/${backupFileName}`,
  };
}

export async function listBackupsAction(): Promise<BackupFileInfo[]> {
  const backupDir = path.resolve(process.cwd(), "data", "backup");
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir);
  return files
    .filter((f) => f.endsWith(".db"))
    .map((fileName) => {
      const filePath = path.join(backupDir, fileName);
      const stat = fs.statSync(filePath);
      const sizeKB = (stat.size / 1024).toFixed(1);
      return {
        fileName,
        sizeBytes: stat.size,
        sizeFormatted: `${sizeKB} KB`,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function deleteBackupAction(fileName: string): Promise<ActionResult> {
  const actor = await requirePermission("settings.manage");

  const safeName = path.basename(fileName);
  if (!safeName.endsWith(".db")) {
    return { success: false, message: "Nama berkas cadangan tidak valid." };
  }

  const backupDir = path.resolve(process.cwd(), "data", "backup");
  const filePath = path.join(backupDir, safeName);

  if (!fs.existsSync(filePath)) {
    return { success: false, message: "Berkas cadangan tidak ditemukan." };
  }

  fs.unlinkSync(filePath);

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "DB_BACKUP_DELETE",
    entity: "System",
    summary: `Menghapus berkas cadangan database: ${safeName}`,
    details: { fileName: safeName },
  });

  return { success: true, message: `Berkas cadangan '${safeName}' berhasil dihapus.` };
}

