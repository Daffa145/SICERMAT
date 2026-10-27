import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";
import { analyze, CtdDossierInput } from "@/lib/ctd-rules";
import { generateDeficiencyLetterDocx } from "@/lib/export/docx";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("case.export");

    const caseRecord = await prisma.case.findUnique({
      where: { id },
    });

    if (!caseRecord) {
      return new NextResponse("Dossier tidak ditemukan", { status: 404 });
    }

    let formData: CtdDossierInput;
    try {
      formData = JSON.parse(caseRecord.rawFormData);
    } catch {
      formData = {};
    }

    const findings = analyze(formData);

    const settings = await prisma.systemSetting.findMany();
    const settingsMap = Object.fromEntries(
      settings.map((s) => [s.key, s.value])
    );

    const docxBuffer = await generateDeficiencyLetterDocx(formData, findings, {
      nomorSurat: settingsMap.default_letter_number,
      agencyName: settingsMap.agency_name,
      penandatanganNama: settingsMap.signatory_name,
      penandatanganJabatan: settingsMap.signatory_title,
    });

    const safeFilename = `Deficiency-Letter-${(
      caseRecord.productName || "CTD"
    ).replace(/[^\w\d-_]/g, "_")}.docx`;

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_EXPORT_DOCX",
      entity: "Case",
      entityId: id,
      summary: `Mengekspor draft Deficiency Letter .docx untuk dossier ${caseRecord.caseNumber}`,
    });

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Export DOCX error:", error);
    if (error.statusCode === 403) {
      return new NextResponse("Akses ditolak: Izin 'case.export' diperlukan.", {
        status: 403,
      });
    }
    return new NextResponse(
      "Gagal menghasilkan dokumen .docx: " + (error.message || "Internal error"),
      { status: 500 }
    );
  }
}
