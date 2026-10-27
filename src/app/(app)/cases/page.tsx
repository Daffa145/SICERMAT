import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { PlusCircle } from "lucide-react";
import { CaseTableClient } from "./table-client";

interface CasesPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    evaluator?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const status = params.status || "";
  const evaluatorId = params.evaluator || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = Math.max(5, Math.min(100, parseInt(params.limit || "8", 10)));
  const sortBy = params.sortBy || "updatedAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  const perms = user.permissions;
  const isEvaluatorOnly =
    perms.includes("case.view_own") && !perms.includes("case.view_all");

  // Filter query
  const where: any = {};

  if (isEvaluatorOnly) {
    where.authorId = user.id;
  } else if (evaluatorId) {
    where.authorId = evaluatorId;
  }

  if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { productName: { contains: q } },
      { applicantName: { contains: q } },
      { activeSubstance: { contains: q } },
      { registrationNumber: { contains: q } },
      { caseNumber: { contains: q } },
    ];
  }

  // Fetch paginated cases and count
  const [totalItems, cases, evaluators]: [
    number,
    any[],
    { id: string; fullName: string; username: string }[]
  ] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, username: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            versionNumber: true,
            summaryS: true,
            summaryK: true,
            summaryT: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    perms.includes("case.view_all")
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, username: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([] as { id: string; fullName: string; username: string }[]),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Daftar Dossier & Kasus Penelaahan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar evaluasi Modul 3 (Mutu) CTD/ACTD obat jadi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {perms.includes("case.create") && (
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-medium transition shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Kasus Baru</span>
            </Link>
          )}
        </div>
      </div>

      {/* Client Table Component with Search, Filters, and Sorting */}
      <CaseTableClient
        initialCases={cases as any}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={page}
        pageSize={pageSize}
        evaluators={evaluators}
        currentFilter={{
          q,
          status,
          evaluator: evaluatorId,
          sortBy,
          sortOrder,
        }}
        canCreate={perms.includes("case.create")}
        canEdit={perms.includes("case.edit_all") || perms.includes("case.edit_own")}
        canEditAll={perms.includes("case.edit_all")}
        canDelete={perms.includes("case.delete")}
        currentUserId={user.id}
        isEvaluatorOnly={isEvaluatorOnly}
      />
    </div>
  );
}
