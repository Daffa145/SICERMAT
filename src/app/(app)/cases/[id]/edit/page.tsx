import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { CaseForm } from "@/components/case-form";
import { AccessDenied } from "@/components/access-denied";
import { ChevronLeft } from "lucide-react";

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      author: { select: { fullName: true, username: true } },
    },
  });

  if (!caseRecord) {
    notFound();
  }

  // Cek otorisasi edit: pemilik kasus dengan hak case.edit_own ATAU user dengan case.edit_all
  const isOwner = user.id === caseRecord.authorId;
  const canEdit =
    user.permissions.includes("case.edit_all") ||
    (isOwner && user.permissions.includes("case.edit_own"));

  if (!canEdit) {
    return (
      <AccessDenied
        permission={isOwner ? "case.edit_own" : "case.edit_all"}
        title="Wewenang Ubah Dossier Ditolak"
        message={`Anda tidak memiliki izin untuk mengubah dossier kasus ${caseRecord.caseNumber} (dibuat oleh ${caseRecord.author.fullName}).`}
      />
    );
  }

  // Jika sudah Final, terkunci
  if (caseRecord.status === "FINAL") {
    redirect(`/cases/${id}`);
  }

  let formData = {};
  try {
    formData = JSON.parse(caseRecord.rawFormData);
  } catch {
    formData = {};
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href={`/cases/${id}`}
          className="hover:underline flex items-center gap-1 text-blue-800 dark:text-blue-400"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Detail Kasus</span>
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">
          Ubah Dossier {caseRecord.caseNumber}
        </span>
      </div>

      <CaseForm initialData={formData} caseId={id} isEditMode={true} />
    </div>
  );
}
