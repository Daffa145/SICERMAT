import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";
import { CtdDossierInput } from "@/lib/ctd-rules";

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("case.create");

    const body = await request.json();
    const rawData: CtdDossierInput = body.formData || body;

    const productName = rawData.produk?.trim() || "Produk Impor";
    const activeSubstance = rawData.api?.trim() || "Bahan Aktif Impor";
    const applicantName = rawData.pemohon?.trim() || "Pemohon Impor";
    const registrationNumber = rawData.noreg?.trim() || "";
    const evaluationDate = rawData.tgl?.trim() || "";
    const responseDeadline = rawData.batas?.trim() || "";
    const reviewerNotes = rawData.cat?.trim() || "";

    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.case.count();
    const caseNumber = `CAS-${currentYear}-${String(countThisYear + 1).padStart(
      4,
      "0"
    )}`;

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
        rawFormData: JSON.stringify(rawData),
      },
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_IMPORT_JSON",
      entity: "Case",
      entityId: newCase.id,
      summary: `Mengimpor data JSON dossier ${caseNumber} (${productName})`,
    });

    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      caseNumber: newCase.caseNumber,
    });
  } catch (error: any) {
    if (error.statusCode === 403) {
      return NextResponse.json(
        { error: "Akses ditolak: Izin 'case.create' diperlukan." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Gagal mengimpor file JSON: " + (error.message || "") },
      { status: 400 }
    );
  }
}
