"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { Clock, FileText, ArrowRight, CheckCircle2, Lock } from "lucide-react";

interface CaseItem {
  id: string;
  caseNumber: string;
  productName: string;
  activeSubstance: string;
  applicantName: string;
  status: string;
  author: {
    fullName: string;
  };
}

interface DashboardTablesProps {
  canReview: boolean;
  casesAwaitingReview: CaseItem[];
  recentCases: CaseItem[];
}

export function DashboardTables({
  canReview,
  casesAwaitingReview,
  recentCases,
}: DashboardTablesProps) {
  // Pagination untuk antrean review
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize, setReviewPageSize] = useState(5);

  const paginatedReviewCases = useMemo(() => {
    const start = (reviewPage - 1) * reviewPageSize;
    return casesAwaitingReview.slice(start, start + reviewPageSize);
  }, [casesAwaitingReview, reviewPage, reviewPageSize]);

  // Pagination untuk kasus terbaru
  const [recentPage, setRecentPage] = useState(1);
  const [recentPageSize, setRecentPageSize] = useState(5);

  const paginatedRecentCases = useMemo(() => {
    const start = (recentPage - 1) * recentPageSize;
    return recentCases.slice(start, start + recentPageSize);
  }, [recentCases, recentPage, recentPageSize]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "FINAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Lock className="w-3 h-3" />
            <span>Final</span>
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Review</span>
          </span>
        );
      case "ANALYZED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Dianalisis</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Antrean Kasus Menunggu Review (Jika Kepala Evaluator / Admin) */}
      {canReview && casesAwaitingReview.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Kasus Menunggu Review Kepala Evaluator ({casesAwaitingReview.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">No. Kasus</th>
                  <th className="py-2.5 px-3">Produk & Bahan Aktif</th>
                  <th className="py-2.5 px-3">Pemohon</th>
                  <th className="py-2.5 px-3">Evaluator</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedReviewCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {c.caseNumber}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {c.productName}
                      </div>
                      <div className="text-[11px] text-slate-500">{c.activeSubstance}</div>
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                      {c.applicantName}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                      {c.author.fullName}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-800 dark:text-blue-400 hover:underline font-medium"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={reviewPage}
            totalItems={casesAwaitingReview.length}
            pageSize={reviewPageSize}
            onPageChange={setReviewPage}
            onPageSizeChange={(sz) => {
              setReviewPageSize(sz);
              setReviewPage(1);
            }}
            itemName="kasus menunggu review"
            pageSizeOptions={[3, 5, 10]}
          />
        </div>
      )}

      {/* Tabel Kasus Terbaru */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Kasus Terbaru
            </h2>
          </div>
          <Link
            href="/cases"
            className="text-xs text-blue-800 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Lihat Semua Kasus</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentCases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada berkas kasus yang tersimpan.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-3">No. Kasus</th>
                    <th className="py-2.5 px-3">Produk & Bahan Aktif</th>
                    <th className="py-2.5 px-3">Pemohon</th>
                    <th className="py-2.5 px-3">Evaluator</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRecentCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {c.caseNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.productName}
                        </div>
                        <div className="text-[11px] text-slate-500">{c.activeSubstance}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {c.applicantName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {c.author.fullName}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(c.status)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-800 dark:text-blue-400 hover:underline font-medium"
                        >
                          <span>Buka</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={recentPage}
              totalItems={recentCases.length}
              pageSize={recentPageSize}
              onPageChange={setRecentPage}
              onPageSizeChange={(sz) => {
                setRecentPageSize(sz);
                setRecentPage(1);
              }}
              itemName="kasus terbaru"
              pageSizeOptions={[3, 5, 10]}
            />
          </>
        )}
      </div>
    </div>
  );
}
