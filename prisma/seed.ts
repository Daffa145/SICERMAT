import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_PERMISSIONS, DEFAULT_ROLES } from "../src/lib/rbac/permissions";
import { analyze, getSummary, generateDeficiencyLetter } from "../src/lib/ctd-rules";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log("[CERMAT Seed] Memulai inisialisasi database...");

  // 1. Seed Permissions
  console.log("[CERMAT Seed] Mengisi permission sistem...");
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        module: perm.module,
        name: perm.name,
        description: perm.description,
      },
      create: {
        code: perm.code,
        module: perm.module,
        name: perm.name,
        description: perm.description,
      },
    });
  }

  // 2. Seed Roles and RolePermissions
  console.log("[CERMAT Seed] Mengisi peran bawaan sistem...");
  const roleMap: Record<string, string> = {};

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: true,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
    });
    roleMap[roleDef.name] = role.id;

    // Bersihkan dan tautkan permission
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const perms = await prisma.permission.findMany({
      where: { code: { in: roleDef.permissions } },
    });

    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });
  }

  // 3. Seed Users
  console.log("[CERMAT Seed] Mengisi akun pengguna awal...");
  
  // Administrator: wajib ganti password pertama kali
  const adminPw = await hash("AdminPassword123!");
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      fullName: "Administrator Sistem",
      nip: "198501152010121001",
      roleId: roleMap["Administrator"],
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      username: "admin",
      fullName: "Administrator Sistem",
      nip: "198501152010121001",
      passwordHash: adminPw,
      roleId: roleMap["Administrator"],
      isActive: true,
      mustChangePassword: true,
    },
  });

  // Kepala Evaluator
  const kepalaPw = await hash("KepalaPassword123!");
  const kepalaUser = await prisma.user.upsert({
    where: { username: "kepala_evaluator" },
    update: {
      fullName: "Dr. Dra. Nurul Hidayati, Apt., M.Si.",
      nip: "197508202000032002",
      roleId: roleMap["Kepala Evaluator"],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      username: "kepala_evaluator",
      fullName: "Dr. Dra. Nurul Hidayati, Apt., M.Si.",
      nip: "197508202000032002",
      passwordHash: kepalaPw,
      roleId: roleMap["Kepala Evaluator"],
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Evaluator
  const evaluatorPw = await hash("EvaluatorPassword123!");
  const evaluatorUser = await prisma.user.upsert({
    where: { username: "evaluator1" },
    update: {
      fullName: "Rian Pratama, S.Farm., Apt.",
      nip: "199203142018011003",
      roleId: roleMap["Evaluator"],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      username: "evaluator1",
      fullName: "Rian Pratama, S.Farm., Apt.",
      nip: "199203142018011003",
      passwordHash: evaluatorPw,
      roleId: roleMap["Evaluator"],
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Pengamat
  const pengamatPw = await hash("PengamatPassword123!");
  await prisma.user.upsert({
    where: { username: "pengamat1" },
    update: {
      fullName: "Siti Anggraini, S.Farm.",
      nip: "199511222020122004",
      roleId: roleMap["Pengamat"],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      username: "pengamat1",
      fullName: "Siti Anggraini, S.Farm.",
      nip: "199511222020122004",
      passwordHash: pengamatPw,
      roleId: roleMap["Pengamat"],
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 4. Seed System Settings
  console.log("[CERMAT Seed] Mengisi pengaturan sistem instansi...");
  const settings = [
    { key: "agency_name", value: "Badan Pengawas Obat dan Makanan (BPOM) RI" },
    { key: "default_letter_number", value: "B-RG.01.02.3.32.10.26.0452" },
    { key: "signatory_name", value: "Dr. Dra. Nurul Hidayati, Apt., M.Si." },
    { key: "signatory_title", value: "Koordinator Kelompok Substansi Penilaian Mutu Obat Jadi" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  // 5. Seed Realistic Pharmaceutical Cases
  console.log("[CERMAT Seed] Mengisi 5 kasus contoh realistis...");

  const seedCases = [
    {
      caseNumber: "CAS-2026-0001",
      productName: "Amoxicillin Kapsul 500 mg",
      activeSubstance: "Amoxicillin Trihydrate",
      applicantName: "PT Kimia Nusantara Farma",
      registrationNumber: "REG-2026-0012",
      evaluationDate: "15 Oktober 2026",
      responseDeadline: "30 hari kerja",
      reviewerNotes: "Dossier lengkap dan memenuhi seluruh standar mutu Zona IVb dan ICH Q2(R1).",
      status: "FINAL",
      authorId: evaluatorUser.id,
      reviewerId: kepalaUser.id,
      rawFormData: {
        produk: "Amoxicillin Kapsul 500 mg",
        api: "Amoxicillin Trihydrate",
        pemohon: "PT Kimia Nusantara Farma",
        noreg: "REG-2026-0012",
        tgl: "15 Oktober 2026",
        batas: "30 hari kerja",
        nbatch: 3,
        skala: "Komersial",
        std: "USP",
        terdaftar: "1",
        urut: "1",
        ltT: 30,
        ltH: 75,
        ltM: 24,
        barrier: "0",
        ltI: [0, 3, 6, 9, 12, 18, 24],
        acT: 40,
        acH: 75,
        acM: 6,
        acI: [0, 1, 3, 6],
        vproc: "assay",
        vmode: "proj",
        vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
        vlinN: 5,
        vaccN: 9,
        vaccL: 3,
        vrepC: "9",
        vlo: 80,
        vhi: 120,
        jalur: "",
        qos: "1",
        hewan: "1",
        dmf: "1",
        eqv: "1",
        cat: "Dossier lengkap dan memenuhi seluruh standar mutu Zona IVb dan ICH Q2(R1).",
      },
    },
    {
      caseNumber: "CAS-2026-0002",
      productName: "Parasetamol Infus 10 mg/mL",
      activeSubstance: "Paracetamol",
      applicantName: "PT Bio Generik Indonesia",
      registrationNumber: "REG-2026-0034",
      evaluationDate: "20 Oktober 2026",
      responseDeadline: "20 hari kerja",
      reviewerNotes: "Perlu konfirmasi keberurutan batch CoA dan validasi kemasan barrier.",
      status: "IN_REVIEW",
      authorId: evaluatorUser.id,
      reviewerId: kepalaUser.id,
      rawFormData: {
        produk: "Parasetamol Infus 10 mg/mL",
        api: "Paracetamol",
        pemohon: "PT Bio Generik Indonesia",
        noreg: "REG-2026-0034",
        tgl: "20 Oktober 2026",
        batas: "20 hari kerja",
        nbatch: 3,
        skala: "Komersial",
        std: "FI",
        terdaftar: "1",
        urut: "0", // klarifikasi
        ltT: 25,
        ltH: 60,
        ltM: 12,
        barrier: "1", // klarifikasi
        ltI: [0, 3, 6, 9, 12],
        acT: 40,
        acH: 75,
        acM: 6,
        acI: [0, 1, 3, 6],
        vproc: "assay",
        vmode: "proj",
        vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
        vlinN: 5,
        vaccN: 9,
        vaccL: 3,
        vrepC: "9",
        vlo: 80,
        vhi: 120,
        jalur: "",
        qos: "1",
        hewan: "0", // klarifikasi
        dmf: "1",
        eqv: "2",
        cat: "Perlu konfirmasi keberurutan batch CoA dan validasi kemasan barrier.",
      },
    },
    {
      caseNumber: "CAS-2026-0003",
      productName: "Azithromycin Suspensi Kering 200 mg/5 mL",
      activeSubstance: "Azithromycin Dihydrate",
      applicantName: "PT Medika Sejahtera Pratama",
      registrationNumber: "REG-2026-0056",
      evaluationDate: "22 Oktober 2026",
      responseDeadline: "30 hari kerja",
      reviewerNotes: "Terdapat beberapa defisiensi mayor pada CoA (skala lab) dan pengujian stabilitas.",
      status: "ANALYZED",
      authorId: evaluatorUser.id,
      rawFormData: {
        produk: "Azithromycin Suspensi Kering 200 mg/5 mL",
        api: "Azithromycin Dihydrate",
        pemohon: "PT Medika Sejahtera Pratama",
        noreg: "REG-2026-0056",
        tgl: "22 Oktober 2026",
        batas: "30 hari kerja",
        nbatch: 2, // gap
        skala: "Laboratorium", // gap
        std: "", // gap
        terdaftar: "0", // gap
        urut: "0",
        ltT: 30,
        ltH: 75,
        ltM: 6, // gap
        barrier: "0",
        ltI: [0, 6], // gap
        acT: 45, // gap
        acH: 60, // gap
        acM: 3, // gap
        acI: [0, 3], // gap
        vproc: "assay",
        vmode: "proj",
        vma: ["acc", "rep", "spec"], // gap
        vlinN: 3,
        vaccN: 6,
        vaccL: 2,
        vrepC: "0",
        vlo: 90,
        vhi: 110,
        jalur: "",
        qos: "0", // gap
        hewan: "0",
        dmf: "0", // gap
        eqv: "0", // gap
        cat: "Terdapat beberapa defisiensi mayor pada CoA (skala lab) dan pengujian stabilitas.",
      },
    },
    {
      caseNumber: "CAS-2026-0004",
      productName: "Sofosbuvir Tablet Salut Selaput 400 mg",
      activeSubstance: "Sofosbuvir",
      applicantName: "PT Indo Pharma Global",
      registrationNumber: "REG-2026-0078",
      evaluationDate: "24 Oktober 2026",
      responseDeadline: "15 hari kerja",
      reviewerNotes: "Permohonan registrasi melalui Jalur Evaluasi 90 Hari (Referensi EMA Uni Eropa). Namun perlu konfirmasi evaluasi khusus karena kategori obat antivirus HCV.",
      status: "ANALYZED",
      authorId: evaluatorUser.id,
      rawFormData: {
        produk: "Sofosbuvir Tablet Salut Selaput 400 mg",
        api: "Sofosbuvir",
        pemohon: "PT Indo Pharma Global",
        noreg: "REG-2026-0078",
        tgl: "24 Oktober 2026",
        batas: "15 hari kerja",
        nbatch: 3,
        skala: "Komersial",
        std: "USP",
        terdaftar: "1",
        urut: "1",
        ltT: 30,
        ltH: 75,
        ltM: 12,
        barrier: "0",
        ltI: [0, 3, 6, 9, 12, 18, 24],
        acT: 40,
        acH: 75,
        acM: 6,
        acI: [0, 1, 3, 6],
        vproc: "assay",
        vmode: "proj",
        vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
        vlinN: 5,
        vaccN: 9,
        vaccL: 3,
        vrepC: "9",
        vlo: 80,
        vhi: 120,
        jalur: "90",
        refc: "Uni Eropa",
        ref5: "1",
        ar: "1",
        pern: "1",
        kate: "1", // kategori khusus (gap untuk jalur 90 hari)
        ident: "1",
        qos: "1",
        hewan: "1",
        dmf: "1",
        eqv: "1",
        cat: "Permohonan registrasi melalui Jalur Evaluasi 90 Hari (Referensi EMA Uni Eropa). Namun perlu konfirmasi evaluasi khusus karena kategori obat antivirus HCV.",
      },
    },
    {
      caseNumber: "CAS-2026-0005",
      productName: "Cefixime Kapsul 100 mg",
      activeSubstance: "Cefixime Trihydrate",
      applicantName: "PT Bintang Farma Andalas",
      registrationNumber: "REG-2026-0099",
      evaluationDate: "25 Oktober 2026",
      responseDeadline: "30 hari kerja",
      reviewerNotes: "Draft dossier baru dimasukkan, menunggu kelengkapan CoA.",
      status: "DRAFT",
      authorId: evaluatorUser.id,
      rawFormData: {
        produk: "Cefixime Kapsul 100 mg",
        api: "Cefixime Trihydrate",
        pemohon: "PT Bintang Farma Andalas",
        noreg: "REG-2026-0099",
        tgl: "25 Oktober 2026",
        batas: "30 hari kerja",
        nbatch: 3,
        skala: "Pilot",
        std: "USP",
        terdaftar: "1",
        urut: "1",
        ltT: 30,
        ltH: 75,
        ltM: 12,
        barrier: "0",
        ltI: [0, 3, 6, 9, 12],
        acT: 40,
        acH: 75,
        acM: 6,
        acI: [0, 1, 3, 6],
        vproc: "assay",
        vmode: "proj",
        vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
        vlinN: 5,
        vaccN: 9,
        vaccL: 3,
        vrepC: "9",
        vlo: 80,
        vhi: 120,
        jalur: "",
        qos: "1",
        hewan: "1",
        dmf: "1",
        eqv: "1",
        cat: "Draft dossier baru dimasukkan, menunggu kelengkapan CoA.",
      },
    },
  ];

  for (const c of seedCases) {
    const existingCase = await prisma.case.findUnique({
      where: { caseNumber: c.caseNumber },
    });

    const caseRecord = await prisma.case.upsert({
      where: { caseNumber: c.caseNumber },
      update: {
        productName: c.productName,
        activeSubstance: c.activeSubstance,
        applicantName: c.applicantName,
        registrationNumber: c.registrationNumber,
        evaluationDate: c.evaluationDate,
        responseDeadline: c.responseDeadline,
        reviewerNotes: c.reviewerNotes,
        status: c.status,
        authorId: c.authorId,
        reviewerId: c.reviewerId || null,
        rawFormData: JSON.stringify(c.rawFormData),
      },
      create: {
        caseNumber: c.caseNumber,
        productName: c.productName,
        activeSubstance: c.activeSubstance,
        applicantName: c.applicantName,
        registrationNumber: c.registrationNumber,
        evaluationDate: c.evaluationDate,
        responseDeadline: c.responseDeadline,
        reviewerNotes: c.reviewerNotes,
        status: c.status,
        authorId: c.authorId,
        reviewerId: c.reviewerId || null,
        rawFormData: JSON.stringify(c.rawFormData),
      },
    });

    // Jika status bukan DRAFT, generate snapshot Versi 1
    if (c.status !== "DRAFT") {
      const findings = analyze(c.rawFormData as any);
      const summary = getSummary(findings);
      const letterText = generateDeficiencyLetter(c.rawFormData as any, findings, {
        nomorSurat: "B-RG.01.02.3.32.10.26.0452",
        penandatanganNama: "Dr. Dra. Nurul Hidayati, Apt., M.Si.",
        penandatanganJabatan: "Koordinator Kelompok Substansi Penilaian Mutu Obat Jadi",
      });

      await prisma.caseVersion.upsert({
        where: {
          caseId_versionNumber: {
            caseId: caseRecord.id,
            versionNumber: 1,
          },
        },
        update: {
          verdict: summary.verdict,
          summaryS: summary.counts.S,
          summaryK: summary.counts.K,
          summaryT: summary.counts.T,
          gapAnalysisResults: JSON.stringify(findings),
          deficiencyLetterText: letterText,
        },
        create: {
          caseId: caseRecord.id,
          versionNumber: 1,
          formDataSnapshot: JSON.stringify(c.rawFormData),
          verdict: summary.verdict,
          summaryS: summary.counts.S,
          summaryK: summary.counts.K,
          summaryT: summary.counts.T,
          gapAnalysisResults: JSON.stringify(findings),
          deficiencyLetterText: letterText,
          createdById: evaluatorUser.id,
        },
      });
    }
  }

  // 6. Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      username: adminUser.username,
      action: "SYSTEM_INITIALIZE",
      entity: "System",
      summary: "Inisialisasi sistem database CERMAT berhasil diselesaikan.",
    },
  });

  console.log("[CERMAT Seed] Berhasil menyelesaikan proses inisialisasi database.");
}

main()
  .catch((e) => {
    console.error("[CERMAT Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
