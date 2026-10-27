import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import "dotenv/config";

async function main() {
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

  if (dbUrl.startsWith("mysql:")) {
    const backupFileName = `cermat-${timestamp}.sql`;
    const targetBackupPath = path.join(backupDir, backupFileName);
    
    // Cari mysqldump path umum (Laragon / XAMPP / PATH)
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
      execSync(`${dumpBin} -u root --databases cermat > "${targetBackupPath}"`, {
        stdio: "inherit",
        shell: "cmd.exe",
      });
      console.log(`[CERMAT Backup] Berhasil mencadangkan MySQL database ke: ./data/backup/${backupFileName}`);
    } catch (err) {
      console.error("Gagal melakukan pencadangan MySQL:", err);
      process.exit(1);
    }
  } else {
    const sourceDbPath = path.join(dataDir, "cermat.db");
    if (!fs.existsSync(sourceDbPath)) {
      console.error("Error: Database aktif belum ditemukan.");
      process.exit(1);
    }
    const backupFileName = `cermat-${timestamp}.db`;
    const targetBackupPath = path.join(backupDir, backupFileName);
    fs.copyFileSync(sourceDbPath, targetBackupPath);
    console.log(`[CERMAT Backup] Berhasil mencadangkan database ke: ./data/backup/${backupFileName}`);
  }
}

main().catch((err) => {
  console.error("Gagal melakukan pencadangan:", err);
  process.exit(1);
});

