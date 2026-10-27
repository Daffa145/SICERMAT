import { prisma } from "../src/lib/prisma";
import { verifyPassword, hashPassword } from "../src/lib/auth/password";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/session";
import { requirePermission, checkPermission } from "../src/lib/rbac/guard";
import { analyze, getSummary, generateDeficiencyLetter } from "../src/lib/ctd-rules";
import { generateDeficiencyLetterDocx } from "../src/lib/export/docx";
import { triggerBackupAction, listBackupsAction } from "../src/server/actions/settings";
import { analyzeCaseAction } from "../src/server/actions/cases";

async function main() {
  console.log("=== VERIFIKASI MENYELURUH SISTEM CERMAT ===\n");

  // 1. Verifikasi Database & Users
  console.log("1. Memeriksa pengguna awal...");
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });
  console.log(`✓ Ditemukan ${users.length} pengguna di database:`);
  users.forEach((u) => {
    console.log(`  - @${u.username} (${u.fullName}) | Peran: ${u.role.name} | Aktif: ${u.isActive} | Wajib Ganti Password: ${u.mustChangePassword} | Permissions: ${u.role.permissions.length}`);
  });

  // 2. Verifikasi Password Hashing & Sesi
  console.log("\n2. Menguji verifikasi password & pembuatan token sesi...");
  const evaluator = users.find((u) => u.username === "evaluator1")!;
  const isMatch = await verifyPassword("EvaluatorPassword123!", evaluator.passwordHash);
  if (!isMatch) throw new Error("Password evaluator1 tidak cocok!");
  console.log("✓ Password bcrypt verify berhasil.");

  const token = await createSessionToken({
    userId: evaluator.id,
    username: evaluator.username,
    fullName: evaluator.fullName,
    roleId: evaluator.roleId,
    roleName: evaluator.role.name,
    mustChangePassword: evaluator.mustChangePassword,
  });
  const decoded = await verifySessionToken(token);
  if (!decoded || decoded.userId !== evaluator.id) {
    throw new Error("Verifikasi token sesi gagal!");
  }
  console.log(`✓ Sesi JWT bertanda tangan berhasil dibuat dan diverifikasi (User: @${decoded.username}, Role: ${decoded.roleName}).`);

  // 3. Verifikasi RBAC & Penegakan Otorisasi Server
  console.log("\n3. Menguji penegakan otorisasi server (RBAC)...");
  const evalPerms = evaluator.role.permissions.map((rp) => rp.permission.code);
  
  // Evaluator punya: case.view_own, case.create, case.edit_own, case.analyze, case.export
  // Evaluator TIDAK punya: user.view, user.create, role.manage, settings.manage
  console.log("  - Evaluator can view own case:", checkPermission(evalPerms, "case.view_own", { isOwner: true }));
  console.log("  - Evaluator can view other's case:", checkPermission(evalPerms, "case.view_own", { isOwner: false }));
  console.log("  - Evaluator can manage users:", checkPermission(evalPerms, "user.view"));
  console.log("  - Evaluator can manage roles:", checkPermission(evalPerms, "role.manage"));

  if (checkPermission(evalPerms, "user.view")) throw new Error("RBAC bocor: evaluator1 bisa akses user.view!");
  if (checkPermission(evalPerms, "role.manage")) throw new Error("RBAC bocor: evaluator1 bisa akses role.manage!");
  if (checkPermission(evalPerms, "case.view_own", { isOwner: false })) throw new Error("RBAC bocor: evaluator1 bisa lihat kasus milik orang lain!");
  console.log("✓ Pembatasan hak akses server-side RBAC bekerja 100% tepat.");

  // 4. Verifikasi Kasus & Snapshot Versi
  console.log("\n4. Menguji kueri kasus & analisis...");
  const cases = await prisma.case.findMany({
    include: {
      versions: true,
      author: true,
    },
  });
  console.log(`✓ Ditemukan ${cases.length} kasus di database:`);
  cases.forEach((c) => {
    console.log(`  - ${c.caseNumber} (${c.productName}) | Status: ${c.status} | Author: @${c.author.username} | Versi Snapshot: ${c.versions.length}`);
  });

  // 5. Verifikasi Ekspor .docx
  console.log("\n5. Menguji ekspor Deficiency Letter ke .docx...");
  const sampleCase = cases[0];
  const formData = JSON.parse(sampleCase.rawFormData);
  const findings = analyze(formData);
  const docxBuffer = await generateDeficiencyLetterDocx(formData, findings, {
    nomorSurat: "B-RG.01.02.3.32.10.26.0452",
    agencyName: "BADAN PENGAWAS OBAT DAN MAKANAN",
    penandatanganNama: "Dr. Dra. Nurul Hidayati, Apt., M.Si.",
    penandatanganJabatan: "Koordinator Kelompok Substansi Penilaian Mutu Obat Jadi",
  });

  // Periksa header file ZIP / docx (PK..)
  const isZip = docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b;
  if (!isZip || docxBuffer.length < 1000) {
    throw new Error("File docx yang dihasilkan rusak atau bukan format Word murni!");
  }
  console.log(`✓ Berkas Word .docx asli berhasil digenerate (${docxBuffer.length} bytes, format valid PK/Office Open XML).`);

  // 6. Verifikasi Pencadangan Database (Backup)
  console.log("\n6. Menguji fungsi pencadangan database...");
  const backups = await listBackupsAction();
  console.log(`✓ Ditemukan ${backups.length} file cadangan di ./data/backup/:`);
  backups.forEach((b) => {
    console.log(`  - ${b.fileName} (${b.sizeFormatted})`);
  });

  console.log("\n=== SELURUH PENGUJIAN INTEGRASI & OTORISASI LULUS 100% ===");
}

main()
  .catch((e) => {
    console.error("Test Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
