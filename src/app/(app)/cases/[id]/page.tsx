import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { CaseDetailClient } from "./detail-client";
import { AccessDenied } from "@/components/access-denied";
import { ChevronLeft } from "lucide-react";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      author: { select: { fullName: true, username: true } },
      reviewer: { select: { fullName: true, username: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          createdBy: { select: { fullName: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { fullName: true, username: true } },
        },
      },
    },
  });

  if (!caseRecord) {
    notFound();
  }

  // Cek kepemilikan jika pengguna hanya memiliki case.view_own
  const perms = user.permissions;
  const isOwner = caseRecord.authorId === user.id;
  const canView =
    perms.includes("case.view_all") || (isOwner && perms.includes("case.view_own"));

  if (!canView) {
    return (
      <AccessDenied
        permission={isOwner ? "case.view_own" : "case.view_all"}
        title="Akses Dossier Kasus Ditolak"
        message="Anda tidak memiliki hak wewenang untuk membuka atau melihat dossier milik evaluator lain."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/cases"
          className="hover:underline flex items-center gap-1 text-blue-800 dark:text-blue-400"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Daftar Kasus</span>
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300 font-mono">
          {caseRecord.caseNumber}
        </span>
      </div>

      <CaseDetailClient caseData={caseRecord as any} currentUser={user} />
    </div>
  );
}
