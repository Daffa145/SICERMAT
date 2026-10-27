import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { PrintButton } from "./print-button";

export default async function CasePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("case.export");

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!caseRecord) {
    notFound();
  }

  const latestVersion = caseRecord.versions[0];
  const letterText =
    latestVersion?.deficiencyLetterText ||
    "Draft Deficiency Letter belum digenerate.";

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen p-4 sm:p-8 print:p-0 print:bg-white">
      {/* Non-print Top Action Bar */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between no-print bg-white dark:bg-slate-950 p-3 rounded border border-slate-300 dark:border-slate-800 shadow-xs">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Format Pratinjau Cetak Resmi Deficiency Letter (A4 / Times New Roman 12pt)
        </div>
        <PrintButton />
      </div>

      {/* Official Letter Paper Layout */}
      <div className="max-w-3xl mx-auto bg-white text-black p-12 sm:p-16 shadow-md border border-slate-300 print:border-none print:shadow-none print:p-0 print-area">
        <div className="font-serif text-[12pt] leading-[1.6] whitespace-pre-wrap">
          {letterText}
        </div>
      </div>
    </div>
  );
}
