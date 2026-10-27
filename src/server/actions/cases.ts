"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission, requireAuth } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";
import {
  analyze,
  getSummary,
  generateDeficiencyLetter,
  CtdDossierInput,
} from "@/lib/ctd-rules";
import { ActionResult } from "./auth";


export async function createCaseAction(
  formData: CtdDossierInput
): Promise<ActionResult<{ id: string; caseNumber: string }>> {
  try {
    const user = await requirePermission("case.create");

    const productName = formData.produk?.trim() || "Produk Tanpa Nama";
    const activeSubstance = formData.api?.trim() || "Bahan Aktif Belum Diisi";
    const applicantName = formData.pemohon?.trim() || "Pemohon Belum Diisi";
    const registrationNumber = formData.noreg?.trim() || "";
    const evaluationDate = formData.tgl?.trim() || "";
    const responseDeadline = formData.batas?.trim() || "";
    const reviewerNotes = formData.cat?.trim() || "";

    // Buat nomor kasus otomatis (mis. CAS-2026-0001)
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.case.count();
    const caseNumber = `CAS-${currentYear}-${String(countThisYear + 1).padStart(4, "0")}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        productName,
        activeSubstance,
        applicantName,
        registrationNumber,
        evaluationDate,
        responseDeadline,
        reviewerNotes,
        status: "DRAFT",
        authorId: user.id,
        rawFormData: JSON.stringify(formData),
      },
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_CREATE",
      entity: "Case",
      entityId: newCase.id,
      summary: `Membuat dossier baru: ${caseNumber} (${productName})`,
      details: { caseNumber, productName, applicantName },
    });

    return {
      success: true,
      data: { id: newCase.id, caseNumber: newCase.caseNumber },
      message: "Dossier berhasil dibuat sebagai draft.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal membuat dossier baru.",
    };
  }
}

export async function updateCaseAction(
  id: string,
  formData: CtdDossierInput
): Promise<ActionResult> {
  try {
    const existingCase = await prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      return { success: false, message: "Dossier tidak ditemukan." };
    }

    // Cek hak akses edit (edit_own atau edit_all)
    const user = await requirePermission("case.edit_own", {
      caseAuthorId: existingCase.authorId,
    });

    if (existingCase.status === "FINAL") {
      return {
        success: false,
        message:
          "Dossier dalam status FINAL telah dikunci dan tidak dapat diubah.",
      };
    }

    const productName = formData.produk?.trim() || existingCase.productName;
    const activeSubstance = formData.api?.trim() || existingCase.activeSubstance;
    const applicantName = formData.pemohon?.trim() || existingCase.applicantName;
    const registrationNumber =
      formData.noreg !== undefined
        ? formData.noreg.trim()
        : existingCase.registrationNumber;
    const evaluationDate =
      formData.tgl !== undefined
        ? formData.tgl.trim()
        : existingCase.evaluationDate;
    const responseDeadline =
      formData.batas !== undefined
        ? formData.batas.trim()
        : existingCase.responseDeadline;
    const reviewerNotes =
      formData.cat !== undefined
        ? formData.cat.trim()
        : existingCase.reviewerNotes;

    await prisma.case.update({
      where: { id },
      data: {
        productName,
        activeSubstance,
        applicantName,
        registrationNumber,
        evaluationDate,
        responseDeadline,
        reviewerNotes,
        rawFormData: JSON.stringify(formData),
      },
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_UPDATE",
      entity: "Case",
      entityId: id,
      summary: `Memperbarui dossier ${existingCase.caseNumber} (${productName})`,
    });

    return { success: true, message: "Perubahan dossier berhasil disimpan." };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal menyimpan perubahan dossier.",
    };
  }
}

export async function analyzeCaseAction(
  id: string,
  updatedFormData?: CtdDossierInput
): Promise<ActionResult<{ versionNumber: number; summary: any }>> {
  try {
    const user = await requirePermission("case.analyze");

    const existingCase = await prisma.case.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!existingCase) {
      return { success: false, message: "Dossier tidak ditemukan." };
    }

    if (existingCase.status === "FINAL") {
      return {
        success: false,
        message: "Dossier dalam status FINAL telah dikunci.",
      };
    }

    // Ambil data form
    let inputData: CtdDossierInput;
    if (updatedFormData) {
      inputData = updatedFormData;
    } else {
      try {
        inputData = JSON.parse(existingCase.rawFormData);
      } catch {
        inputData = {};
      }
    }

    // Ambil pengaturan surat instansi
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    // Eksekusi Rule Engine
    const findings = analyze(inputData);
    const summary = getSummary(findings);
    const letterText = generateDeficiencyLetter(inputData, findings, {
      nomorSurat: settingsMap.default_letter_number || undefined,
      penandatanganNama: settingsMap.signatory_name || undefined,
      penandatanganJabatan: settingsMap.signatory_title || undefined,
    });

    const nextVersionNumber =
      (existingCase.versions[0]?.versionNumber || 0) + 1;

    // Simpan snapshot versi baru & perbarui status
    await prisma.$transaction([
      prisma.caseVersion.create({
        data: {
          caseId: id,
          versionNumber: nextVersionNumber,
          formDataSnapshot: JSON.stringify(inputData),
          verdict: summary.verdict,
          summaryS: summary.counts.S,
          summaryK: summary.counts.K,
          summaryT: summary.counts.T,
          gapAnalysisResults: JSON.stringify(findings),
          deficiencyLetterText: letterText,
          createdById: user.id,
        },
      }),
      prisma.case.update({
        where: { id },
        data: {
          rawFormData: JSON.stringify(inputData),
          status: existingCase.status === "DRAFT" ? "ANALYZED" : existingCase.status,
        },
      }),
    ]);

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_ANALYZE",
      entity: "Case",
      entityId: id,
      summary: `Menjalankan analisis dossier ${existingCase.caseNumber} (Versi ${nextVersionNumber}): ${summary.counts.S} Sesuai, ${summary.counts.K} Klarifikasi, ${summary.counts.T} Tidak Sesuai`,
      details: {
        versionNumber: nextVersionNumber,
        counts: summary.counts,
        verdict: summary.verdict,
      },
    });

    return {
      success: true,
      data: { versionNumber: nextVersionNumber, summary },
      message: `Analisis selesai. Snapshot Versi ${nextVersionNumber} berhasil disimpan.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal menjalankan analisis dossier.",
    };
  }
}

export async function changeCaseStatusAction(
  id: string,
  newStatus: "DRAFT" | "ANALYZED" | "IN_REVIEW" | "FINAL",
  notes?: string
): Promise<ActionResult> {
  try {
    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      return { success: false, message: "Dossier tidak ditemukan." };
    }

    // Jika mengubah ke FINAL atau membuka kembali dari FINAL, butuh permission case.finalize
    if (newStatus === "FINAL" || existingCase.status === "FINAL") {
      const user = await requirePermission("case.finalize");
      await prisma.case.update({
        where: { id },
        data: { status: newStatus },
      });

      if (notes) {
        await prisma.caseComment.create({
          data: {
            caseId: id,
            userId: user.id,
            content: `[Perubahan Status ke ${newStatus}] ${notes}`,
          },
        });
      }

      await logAudit({
        userId: user.id,
        username: user.username,
        action: "CASE_STATUS_CHANGE",
        entity: "Case",
        entityId: id,
        summary: `Mengubah status dossier ${existingCase.caseNumber} dari ${existingCase.status} menjadi ${newStatus}`,
        details: { from: existingCase.status, to: newStatus, notes },
      });

      return {
        success: true,
        message: `Status dossier berhasil diubah menjadi ${newStatus}.`,
      };
    }

    // Perubahan status reguler (DRAFT -> IN_REVIEW)
    const user = await requirePermission("case.edit_own", {
      caseAuthorId: existingCase.authorId,
    });

    await prisma.case.update({
      where: { id },
      data: { status: newStatus },
    });

    if (notes) {
      await prisma.caseComment.create({
        data: {
          caseId: id,
          userId: user.id,
          content: `[Perubahan Status ke ${newStatus}] ${notes}`,
        },
      });
    }

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_STATUS_CHANGE",
      entity: "Case",
      entityId: id,
      summary: `Mengubah status dossier ${existingCase.caseNumber} dari ${existingCase.status} menjadi ${newStatus}`,
      details: { from: existingCase.status, to: newStatus, notes },
    });

    return {
      success: true,
      message: `Status dossier berhasil diubah menjadi ${newStatus}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal memperbarui status dossier.",
    };
  }
}

export async function deleteCaseAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("case.delete");

    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      return { success: false, message: "Dossier tidak ditemukan." };
    }

    if (existingCase.status === "FINAL") {
      return {
        success: false,
        message: "Dossier yang telah berstatus FINAL tidak dapat dihapus.",
      };
    }

    await prisma.case.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_DELETE",
      entity: "Case",
      entityId: id,
      summary: `Menghapus dossier ${existingCase.caseNumber} (${existingCase.productName})`,
    });

    return { success: true, message: "Dossier berhasil dihapus." };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Gagal menghapus dossier.",
    };
  }
}

export async function addCaseCommentAction(
  caseId: string,
  content: string
): Promise<ActionResult> {
  const user = await requireAuth();

  if (!content.trim()) {
    return { success: false, message: "Isi komentar tidak boleh kosong." };
  }

  await prisma.caseComment.create({
    data: {
      caseId,
      userId: user.id,
      content: content.trim(),
    },
  });

  return { success: true, message: "Komentar berhasil ditambahkan." };
}

export async function updateCaseCommentAction(
  commentId: string,
  content: string
): Promise<ActionResult> {
  const user = await requireAuth();

  if (!content.trim()) {
    return { success: false, message: "Isi komentar tidak boleh kosong." };
  }

  const comment = await prisma.caseComment.findUnique({
    where: { id: commentId },
    include: { case: true },
  });

  if (!comment) {
    return { success: false, message: "Komentar tidak ditemukan." };
  }

  const isAuthor = comment.userId === user.id;
  const isAdmin =
    user.permissions.includes("case.finalize") ||
    user.permissions.includes("case.edit_all");

  if (!isAuthor && !isAdmin) {
    return {
      success: false,
      message: "Anda tidak memiliki hak akses untuk mengubah komentar ini.",
    };
  }

  await prisma.caseComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
  });

  await logAudit({
    userId: user.id,
    username: user.username,
    action: "CASE_COMMENT_UPDATE",
    entity: "CaseComment",
    entityId: commentId,
    summary: `Memperbarui komentar pada kasus ${comment.case.caseNumber}`,
  });

  return { success: true, message: "Komentar berhasil diperbarui." };
}

export async function deleteCaseCommentAction(
  commentId: string
): Promise<ActionResult> {
  const user = await requireAuth();

  const comment = await prisma.caseComment.findUnique({
    where: { id: commentId },
    include: { case: true },
  });

  if (!comment) {
    return { success: false, message: "Komentar tidak ditemukan." };
  }

  const isAuthor = comment.userId === user.id;
  const canDeleteAny =
    user.permissions.includes("case.finalize") ||
    user.permissions.includes("case.delete") ||
    user.permissions.includes("case.edit_all");

  if (!isAuthor && !canDeleteAny) {
    return {
      success: false,
      message: "Anda tidak memiliki hak akses untuk menghapus komentar ini.",
    };
  }

  await prisma.caseComment.delete({
    where: { id: commentId },
  });

  await logAudit({
    userId: user.id,
    username: user.username,
    action: "CASE_COMMENT_DELETE",
    entity: "CaseComment",
    entityId: commentId,
    summary: `Menghapus komentar pada kasus ${comment.case.caseNumber}`,
  });

  return { success: true, message: "Komentar berhasil dihapus." };
}
