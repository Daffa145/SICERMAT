import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";

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

    let formData = {};
    try {
      formData = JSON.parse(caseRecord.rawFormData);
    } catch {
      formData = {};
    }

    const exportPayload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      caseNumber: caseRecord.caseNumber,
      productName: caseRecord.productName,
      activeSubstance: caseRecord.activeSubstance,
      applicantName: caseRecord.applicantName,
      formData,
    };

    const safeFilename = `kasus-${(caseRecord.productName || "ctd").replace(
      /[^\w\d-_]/g,
      "_"
    )}.json`;

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "CASE_EXPORT_JSON",
      entity: "Case",
      entityId: id,
      summary: `Mengekspor data JSON dossier ${caseRecord.caseNumber}`,
    });

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error: any) {
    if (error.statusCode === 403) {
      return new NextResponse("Akses ditolak: Izin 'case.export' diperlukan.", {
        status: 403,
      });
    }
    return new NextResponse("Gagal mengekspor data JSON", { status: 500 });
  }
}
