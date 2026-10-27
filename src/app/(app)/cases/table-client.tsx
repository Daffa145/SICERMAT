"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/pagination";
import {
  Search,
  Upload,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { deleteCaseAction } from "@/server/actions/cases";

interface CaseItem {
  id: string;
  caseNumber: string;
  productName: string;
  activeSubstance: string;
  applicantName: string;
  registrationNumber?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    username: string;
  };
  versions: {
    versionNumber: number;
    summaryS: number;
    summaryK: number;
    summaryT: number;
  }[];
}

interface CaseTableClientProps {
  initialCases: CaseItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  evaluators: { id: string; fullName: string; username: string }[];
  currentFilter: {
    q: string;
    status: string;
    evaluator: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
  pageSize?: number;
  canCreate: boolean;
  canEdit?: boolean;
  canEditAll?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
  isEvaluatorOnly: boolean;
}

export function CaseTableClient({
  initialCases,
  totalItems,
  totalPages: _totalPages,
  currentPage,
  pageSize = 8,
  evaluators,
  currentFilter,
  canCreate,
  canEdit = false,
  canEditAll = false,
  canDelete = false,
  currentUserId,
  isEvaluatorOnly,
}: CaseTableClientProps) {
  const router = useRouter();

  const [q, setQ] = useState(currentFilter.q);
  const [status, setStatus] = useState(currentFilter.status);
  const [evaluator, setEvaluator] = useState(currentFilter.evaluator);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // State untuk Hapus Kasus
  const [deletingCase, setDeletingCase] = useState<CaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyFilters = (overrides?: Partial<typeof currentFilter>) => {
    const params = new URLSearchParams();
    const query = overrides?.q !== undefined ? overrides.q : q;
    const stat = overrides?.status !== undefined ? overrides.status : status;
    const evalId =
      overrides?.evaluator !== undefined ? overrides.evaluator : evaluator;
    const sort = overrides?.sortBy || currentFilter.sortBy;
    const order = overrides?.sortOrder || currentFilter.sortOrder;

    if (query) params.set("q", query);
    if (stat) params.set("status", stat);
    if (evalId) params.set("evaluator", evalId);
    if (sort) params.set("sortBy", sort);
    if (order) params.set("sortOrder", order);
    params.set("page", "1");

    router.push(`/cases?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q });
  };

  const handleSort = (columnKey: string) => {
    const newOrder =
      currentFilter.sortBy === columnKey && currentFilter.sortOrder === "asc"
        ? "desc"
        : "asc";
    applyFilters({ sortBy: columnKey, sortOrder: newOrder });
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`/cases?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", String(newSize));
    params.set("page", "1");
    router.push(`/cases?${params.toString()}`);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const res = await fetch("/api/cases/import/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Gagal mengimpor file");
      }

      router.push(`/cases/${result.caseId}`);
      router.refresh();
    } catch (err: any) {
      setImportError(err.message || "File JSON tidak valid.");
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FINAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Final
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Dalam Review
          </span>
        );
      case "ANALYZED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Dianalisis
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari produk, API, pemohon, no. registrasi..."
              className="w-full pl-8 pr-16 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1 top-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded transition"
            >
              Cari
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                applyFilters({ status: e.target.value });
              }}
              className="text-xs py-1.5 px-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ANALYZED">Dianalisis</option>
              <option value="IN_REVIEW">Dalam Review</option>
              <option value="FINAL">Final</option>
            </select>

            {!isEvaluatorOnly && evaluators.length > 0 && (
              <select
                value={evaluator}
                onChange={(e) => {
                  setEvaluator(e.target.value);
                  applyFilters({ evaluator: e.target.value });
                }}
                className="text-xs py-1.5 px-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="">Semua Evaluator</option>
                {evaluators.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.fullName}
                  </option>
                ))}
              </select>
            )}

            {canCreate && (
              <label className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-medium cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? "Mengimpor..." : "Impor JSON"}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportJson}
                  disabled={isImporting}
                />
              </label>
            )}
          </div>
        </div>

        {importError && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            {importError}
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th
                  onClick={() => handleSort("caseNumber")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>No. Kasus</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("productName")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Produk & Bahan Aktif</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("applicantName")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Pemohon Registrasi</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Evaluator</th>
                <th
                  onClick={() => handleSort("status")}
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Hasil Evaluasi</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {initialCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ditemukan dossier yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                initialCases.map((c) => {
                  const latestVersion = c.versions[0];
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <Link
                          href={`/cases/${c.id}`}
                          className="hover:underline text-blue-800 dark:text-blue-400"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {c.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{c.activeSubstance}</span>
                          {c.registrationNumber && (
                            <span className="font-mono text-slate-400">
                              • Ref: {c.registrationNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {c.applicantName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {c.author.fullName}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {latestVersion ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              title="Jumlah Parameter Sesuai"
                            >
                              S:{latestVersion.summaryS}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title="Jumlah Parameter Klarifikasi"
                            >
                              K:{latestVersion.summaryK}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                              title="Jumlah Parameter Tidak Sesuai"
                            >
                              T:{latestVersion.summaryT}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Belum dianalisis
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition"
                            title="Buka Detail Kasus"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Buka</span>
                          </Link>

                          {canEdit &&
                            c.status !== "FINAL" &&
                            (canEditAll || c.author.id === currentUserId) && (
                              <Link
                                href={`/cases/${c.id}/edit`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-medium transition"
                                title="Ubah Formulir Data Kasus"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Ubah</span>
                              </Link>
                            )}

                          {canDelete && c.status !== "FINAL" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setDeletingCase(c);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-400 font-medium transition"
                              title="Hapus Kasus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only sm:not-sr-only">Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
          itemName="dossier kasus"
          pageSizeOptions={[5, 8, 10, 20, 50]}
        />
      </div>

      {/* Modal Konfirmasi Hapus Kasus */}
      {deletingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Konfirmasi Hapus Kasus
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setDeletingCase(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus dossier kasus{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {deletingCase.caseNumber}
              </strong>{" "}
              (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {deletingCase.productName}
              </span>
              )? Tindakan ini akan menghapus seluruh snapshot versi dan komentar terkait secara permanen.
            </p>

            {actionError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCase(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setActionError(null);
                  try {
                    const res = await deleteCaseAction(deletingCase.id);
                    if (!res.success) {
                      throw new Error(res.message || "Gagal menghapus kasus");
                    }
                    setDeletingCase(null);
                    router.refresh();
                  } catch (err: any) {
                    setActionError(err.message || "Gagal menghapus kasus");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseTableClient;
