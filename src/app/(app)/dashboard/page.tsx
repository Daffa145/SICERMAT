import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import {
  PlusCircle,
} from "lucide-react";
import { DashboardTables } from "./dashboard-tables";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const perms = user.permissions;
  const isEvaluatorOnly =
    perms.includes("case.view_own") && !perms.includes("case.view_all");

  const caseFilter = isEvaluatorOnly ? { authorId: user.id } : {};

  // Hitung jumlah kasus per status
  const [totalCount, draftCount, analyzedCount, reviewCount, finalCount] =
    await Promise.all([
      prisma.case.count({ where: caseFilter }),
      prisma.case.count({ where: { ...caseFilter, status: "DRAFT" } }),
      prisma.case.count({ where: { ...caseFilter, status: "ANALYZED" } }),
      prisma.case.count({ where: { ...caseFilter, status: "IN_REVIEW" } }),
      prisma.case.count({ where: { ...caseFilter, status: "FINAL" } }),
    ]);

  // Kasus menunggu review (khusus Kepala Evaluator & Admin)
  const canReview = perms.includes("case.finalize");
  const casesAwaitingReview = canReview
    ? await prisma.case.findMany({
        where: { status: "IN_REVIEW" },
        include: { author: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
    : [];

  // Kasus terbaru
  const recentCases = await prisma.case.findMany({
    where: caseFilter,
    include: { author: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Dashboard Penelaahan Mutu
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Selamat datang, <span className="font-semibold text-slate-800 dark:text-slate-200">{user.fullName}</span> ({user.roleName})
          </p>
        </div>

        {perms.includes("case.create") && (
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded text-xs font-medium transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Kasus Baru</span>
          </Link>
        )}
      </div>

      {/* Ringkasan Angka Metrik */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Dossier
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {totalCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Draft
          </div>
          <div className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-400 mt-1">
            {draftCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Dianalisis
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 mt-1">
            {analyzedCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Dalam Review
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
            {reviewCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3.5 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Final
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {finalCount}
          </div>
        </div>
      </div>

      {/* Client Tables with Integrated Pagination */}
      <DashboardTables
        canReview={canReview}
        casesAwaitingReview={casesAwaitingReview as any}
        recentCases={recentCases as any}
      />
    </div>
  );
}
