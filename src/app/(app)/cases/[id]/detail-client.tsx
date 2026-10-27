"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/pagination";
import {
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Copy,
  Edit,
  Pencil,
  Trash2,
  PlayCircle,
  Send,
  Lock,
  Unlock,
  Check,
  Loader2,
  X,
} from "lucide-react";
import {
  analyzeCaseAction,
  changeCaseStatusAction,
  addCaseCommentAction,
  updateCaseCommentAction,
  deleteCaseCommentAction,
  deleteCaseAction,
} from "@/server/actions/cases";

interface DetailClientProps {
  caseData: {
    id: string;
    caseNumber: string;
    productName: string;
    activeSubstance: string;
    applicantName: string;
    registrationNumber: string | null;
    evaluationDate: string | null;
    responseDeadline: string | null;
    reviewerNotes: string | null;
    status: string;
    authorId: string;
    author: { fullName: string; username: string };
    reviewer: { fullName: string; username: string } | null;
    versions: {
      id: string;
      versionNumber: number;
      verdict: string;
      summaryS: number;
      summaryK: number;
      summaryT: number;
      gapAnalysisResults: string;
      deficiencyLetterText: string;
      createdAt: string;
      createdBy: { fullName: string };
    }[];
    comments: {
      id: string;
      userId: string;
      content: string;
      createdAt: string;
      user: { fullName: string; username: string };
    }[];
  };
  currentUser: {
    id: string;
    username: string;
    fullName: string;
    roleName: string;
    permissions: string[];
  };
}

export function CaseDetailClient({ caseData, currentUser }: DetailClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "ringkasan" | "gap" | "surat" | "versi" | "komentar"
  >("ringkasan");

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [onlyFindings, setOnlyFindings] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const perms = currentUser.permissions;
  const isFinal = caseData.status === "FINAL";
  const isOwner = currentUser.id === caseData.authorId;
  const canEdit =
    !isFinal &&
    (perms.includes("case.edit_all") ||
      (isOwner && perms.includes("case.edit_own")));
  const canAnalyze = !isFinal && perms.includes("case.analyze");
  const canFinalize = perms.includes("case.finalize");
  const canExport = perms.includes("case.export");

  const versions = useMemo(() => caseData.versions || [], [caseData.versions]);
  const currentVersion = versions[selectedVersionIndex] || versions[0];

  let gapFindings: any[] = [];
  if (currentVersion?.gapAnalysisResults) {
    try {
      gapFindings = JSON.parse(currentVersion.gapAnalysisResults);
    } catch {
      gapFindings = [];
    }
  }

  const displayedFindings = onlyFindings
    ? gapFindings.filter((r) => r.st !== "S")
    : gapFindings;

  // Pagination untuk Gap Analysis Table
  const [gapPage, setGapPage] = useState(1);
  const [gapPageSize, setGapPageSize] = useState(8);

  useEffect(() => {
    setGapPage(1);
  }, [onlyFindings, selectedVersionIndex]);

  const paginatedFindings = useMemo(() => {
    const start = (gapPage - 1) * gapPageSize;
    return displayedFindings.slice(start, start + gapPageSize);
  }, [displayedFindings, gapPage, gapPageSize]);

  // Pagination untuk Riwayat Versi (Tab 4)
  const [versionPage, setVersionPage] = useState(1);
  const versionPageSize = 6;
  const paginatedVersions = useMemo(() => {
    const start = (versionPage - 1) * versionPageSize;
    return versions.slice(start, start + versionPageSize);
  }, [versions, versionPage]);

  const handleCopyLetter = () => {
    if (!currentVersion?.deficiencyLetterText) return;
    navigator.clipboard.writeText(currentVersion.deficiencyLetterText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleRunAnalysis = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await analyzeCaseAction(caseData.id);
      if (!res.success) throw new Error(res.message);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Gagal menganalisis.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeStatus = async (
    newStatus: "DRAFT" | "ANALYZED" | "IN_REVIEW" | "FINAL",
    notes?: string
  ) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await changeCaseStatusAction(caseData.id, newStatus, notes);
      if (!res.success) throw new Error(res.message);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Gagal memperbarui status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await addCaseCommentAction(caseData.id, commentText);
      if (!res.success) throw new Error(res.message);
      setCommentText("");
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Gagal menambahkan komentar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // State & Handler untuk Hapus Kasus
  const [isDeleteCaseOpen, setIsDeleteCaseOpen] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);

  const handleDeleteCase = async () => {
    setIsDeletingCase(true);
    setActionError(null);
    try {
      const res = await deleteCaseAction(caseData.id);
      if (!res.success) throw new Error(res.message);
      router.push("/cases");
    } catch (err: any) {
      setActionError(err.message || "Gagal menghapus kasus.");
      setIsDeletingCase(false);
      setIsDeleteCaseOpen(false);
    }
  };

  // State & Handler untuk Ubah dan Hapus Komentar
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const handleStartEditComment = (id: string, currentContent: string) => {
    setEditingCommentId(id);
    setEditCommentText(currentContent);
  };

  const handleSaveEditComment = async (id: string) => {
    if (!editCommentText.trim()) return;
    setIsUpdatingComment(true);
    setActionError(null);
    try {
      const res = await updateCaseCommentAction(id, editCommentText);
      if (!res.success) throw new Error(res.message);
      setEditingCommentId(null);
      setEditCommentText("");
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Gagal memperbarui komentar.");
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan/komentar ini?")) return;
    setDeletingCommentId(id);
    setActionError(null);
    try {
      const res = await deleteCaseCommentAction(id);
      if (!res.success) throw new Error(res.message);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "Gagal menghapus komentar.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "FINAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Lock className="w-3 h-3" />
            <span>Final (Terkunci)</span>
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Dalam Review</span>
          </span>
        );
      case "ANALYZED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Dianalisis</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Draft
          </span>
        );
    }
  };

  const cls: Record<string, string> = {
    S: "Sesuai",
    K: "Klarifikasi",
    T: "Tidak Sesuai",
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                {caseData.caseNumber}
              </span>
              {getStatusBadge(caseData.status)}
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {caseData.productName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              API: <span className="font-medium text-slate-700 dark:text-slate-300">{caseData.activeSubstance}</span> • Pemohon:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{caseData.applicantName}</span> • Evaluator:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{caseData.author.fullName}</span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Link
                href={`/cases/${caseData.id}/edit`}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Ubah Data</span>
              </Link>
            )}

            {canAnalyze && (
              <button
                onClick={handleRunAnalysis}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Jalankan Analisis</span>
              </button>
            )}

            {/* Alur Status */}
            {caseData.status === "ANALYZED" && (
              <button
                onClick={() =>
                  handleChangeStatus("IN_REVIEW", "Diajukan ke Kepala Evaluator untuk review.")
                }
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Review</span>
              </button>
            )}

            {canFinalize && caseData.status === "IN_REVIEW" && (
              <button
                onClick={() =>
                  handleChangeStatus("FINAL", "Dossier telah direview dan disahkan sebagai FINAL.")
                }
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalisasi Kasus</span>
              </button>
            )}

            {canFinalize && isFinal && (
              <button
                onClick={() =>
                  handleChangeStatus("IN_REVIEW", "Kasus dibuka kembali untuk evaluasi ulang.")
                }
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kembali</span>
              </button>
            )}

            {/* Export Toolbar */}
            {canExport && (
              <>
                <a
                  href={`/api/cases/${caseData.id}/export/docx`}
                  download
                  className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                  title="Unduh Surat Resmi .docx"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word (.docx)</span>
                </a>

                <Link
                  href={`/cases/${caseData.id}/print`}
                  target="_blank"
                  className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                  title="Cetak Halaman / PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </Link>

                <a
                  href={`/api/cases/${caseData.id}/export/json`}
                  download
                  className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                  title="Ekspor Data Kasus (.json)"
                >
                  .JSON
                </a>
              </>
            )}

            {perms.includes("case.delete") && !isFinal && (
              <button
                type="button"
                onClick={() => setIsDeleteCaseOpen(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1.5 disabled:opacity-50"
                title="Hapus Kasus"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-3 p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400">
            {actionError}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("ringkasan")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === "ringkasan"
              ? "border-blue-800 text-blue-800 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Ringkasan Evaluasi
        </button>

        <button
          onClick={() => setActiveTab("gap")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === "gap"
              ? "border-blue-800 text-blue-800 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Gap Analysis & Pemenuhan ({displayedFindings.length})
        </button>

        <button
          onClick={() => setActiveTab("surat")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === "surat"
              ? "border-blue-800 text-blue-800 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Draft Deficiency Letter
        </button>

        <button
          onClick={() => setActiveTab("versi")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === "versi"
              ? "border-blue-800 text-blue-800 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Riwayat Versi ({versions.length})
        </button>

        <button
          onClick={() => setActiveTab("komentar")}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === "komentar"
              ? "border-blue-800 text-blue-800 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Komentar & Catatan ({caseData.comments.length})
        </button>
      </div>

      {/* Tab 1: Ringkasan */}
      {activeTab === "ringkasan" && (
        <div className="space-y-4">
          {currentVersion ? (
            <div className="space-y-4">
              {/* Verdict Card */}
              <div
                className={`p-5 rounded border-l-4 shadow-xs ${
                  currentVersion.summaryT > 0
                    ? "bg-red-50/80 dark:bg-red-950/20 border-red-600 dark:border-red-500 border border-slate-200 dark:border-slate-800"
                    : currentVersion.summaryK > 0
                    ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-500 dark:border-amber-400 border border-slate-200 dark:border-slate-800"
                    : "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-600 dark:border-emerald-500 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentVersion.verdict}
                </div>

                {/* Meter Bar */}
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 my-3 gap-0.5">
                  <div
                    style={{ flex: currentVersion.summaryS }}
                    className="bg-emerald-600"
                    title={`${currentVersion.summaryS} Sesuai`}
                  />
                  <div
                    style={{ flex: currentVersion.summaryK }}
                    className="bg-amber-500"
                    title={`${currentVersion.summaryK} Klarifikasi`}
                  />
                  <div
                    style={{ flex: currentVersion.summaryT }}
                    className="bg-red-600"
                    title={`${currentVersion.summaryT} Tidak Sesuai`}
                  />
                </div>

                <div className="flex flex-wrap items-baseline gap-6 text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mr-1.5">
                      {currentVersion.summaryS}
                    </span>
                    <span>parameter sesuai</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400 mr-1.5">
                      {currentVersion.summaryK}
                    </span>
                    <span>butir klarifikasi</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold font-mono text-red-700 dark:text-red-400 mr-1.5">
                      {currentVersion.summaryT}
                    </span>
                    <span>ketidaksesuaian (gap)</span>
                  </div>
                </div>
              </div>

              {/* Dossier Meta Summary Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium w-1/4">
                        Nama Produk
                      </th>
                      <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-semibold w-1/4">
                        {caseData.productName}
                      </td>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium w-1/4">
                        Bahan Aktif (API)
                      </th>
                      <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 font-semibold w-1/4">
                        {caseData.activeSubstance}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium">
                        Pemohon Registrasi
                      </th>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {caseData.applicantName}
                      </td>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium">
                        No. Registrasi / Ref
                      </th>
                      <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {caseData.registrationNumber || "-"}
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium">
                        Tanggal Evaluasi
                      </th>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {caseData.evaluationDate || "-"}
                      </td>
                      <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium">
                        Batas Tanggapan
                      </th>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {caseData.responseDeadline || "-"}
                      </td>
                    </tr>
                    {caseData.reviewerNotes && (
                      <tr>
                        <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-left font-medium">
                          Catatan Evaluator
                        </th>
                        <td colSpan={3} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                          {caseData.reviewerNotes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded text-xs text-slate-500">
              Dossier belum pernah dianalisis. Silakan klik tombol <b>Jalankan Analisis</b> di pojok kanan atas.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Gap Analysis Table */}
      {activeTab === "gap" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan parameter pengujian mutu berdasarkan aturan regulasi BPOM dan ICH Q2(R1)
            </span>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFindings}
                onChange={(e) => setOnlyFindings(e.target.checked)}
                className="accent-blue-800 rounded cursor-pointer"
              />
              <span>Hanya tampilkan temuan (gap & klarifikasi)</span>
            </label>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-3 w-[26%]">Parameter Evaluasi</th>
                    <th className="py-2.5 px-3 w-[18%]">Temuan Dokumen</th>
                    <th className="py-2.5 px-3 w-[22%]">Standar Acuan</th>
                    <th className="py-2.5 px-3 w-[14%]">Status</th>
                    <th className="py-2.5 px-3 w-[20%]">Catatan Penelaahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedFindings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {onlyFindings
                          ? "Seluruh parameter memenuhi kriteria (tidak ada gap/klarifikasi)."
                          : "Belum ada data analisis."}
                      </td>
                    </tr>
                  ) : (
                    paginatedFindings.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                          r.st === "T"
                            ? "bg-red-50/30 dark:bg-red-950/10"
                            : r.st === "K"
                            ? "bg-amber-50/30 dark:bg-amber-950/10"
                            : ""
                        }`}
                      >
                        <td
                          className={`py-2 px-3 font-medium text-slate-900 dark:text-slate-100 ${
                            r.st === "T"
                              ? "border-l-4 border-l-red-600"
                              : r.st === "K"
                              ? "border-l-4 border-l-amber-500"
                              : "border-l-4 border-l-emerald-600"
                          }`}
                        >
                          {r.p}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono">
                          {r.f}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {r.s}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.st === "S"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : r.st === "K"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                            }`}
                          >
                            {cls[r.st] || r.st}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {r.n}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination untuk Tabel Gap Analysis */}
            <Pagination
              currentPage={gapPage}
              totalItems={displayedFindings.length}
              pageSize={gapPageSize}
              onPageChange={setGapPage}
              onPageSizeChange={(sz) => {
                setGapPageSize(sz);
                setGapPage(1);
              }}
              itemName="parameter evaluasi"
              pageSizeOptions={[5, 8, 10, 15, 25]}
            />
          </div>
        </div>
      )}

      {/* Tab 3: Draft Surat */}
      {activeTab === "surat" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Naskah dinas resmi Deficiency Letter yang digenerate otomatis berdasarkan temuan evaluasi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLetter}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin ke Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Naskah</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-200 dark:bg-slate-800 p-6 sm:p-10 rounded">
            <div className="max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 shadow-md border border-slate-300 rounded-xs font-serif text-[14px] leading-relaxed whitespace-pre-wrap">
              {currentVersion?.deficiencyLetterText || "Draft surat belum digenerate."}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Riwayat Versi Snapshot */}
      {activeTab === "versi" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Setiap kali tombol &quot;Analisis Dossier&quot; dijalankan, snapshot hasil evaluasi disimpan secara permanen sebagai versi historis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedVersions.map((ver, idx) => {
              const actualIdx = (versionPage - 1) * versionPageSize + idx;
              const isSelected = actualIdx === selectedVersionIndex;
              return (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersionIndex(actualIdx)}
                  className={`p-4 rounded border cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 shadow-xs ring-1 ring-blue-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-900 dark:text-blue-300">
                      Versi {ver.versionNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ver.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">
                    {ver.verdict}
                  </p>

                  <div className="flex items-center gap-2 font-mono text-[11px] mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      S: {ver.summaryS}
                    </span>
                    <span>•</span>
                    <span className="text-amber-700 dark:text-amber-400">
                      K: {ver.summaryK}
                    </span>
                    <span>•</span>
                    <span className="text-red-700 dark:text-red-400">
                      T: {ver.summaryT}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {versions.length > versionPageSize && (
            <Pagination
              currentPage={versionPage}
              totalItems={versions.length}
              pageSize={versionPageSize}
              onPageChange={setVersionPage}
              itemName="versi snapshot"
            />
          )}
        </div>
      )}

      {/* Tab 5: Komentar & Review */}
      {activeTab === "komentar" && (
        <div className="space-y-4">
          <form onSubmit={handleAddComment} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tambah Komentar / Catatan Telaah
            </label>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Tuliskan catatan teknis atau arahan review..."
              className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isProcessing || !commentText.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition disabled:opacity-50"
              >
                Kirim Catatan
              </button>
            </div>
          </form>

          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            {caseData.comments.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Belum ada komentar.</p>
            ) : (
              caseData.comments.map((cm) => {
                const canModifyComment =
                  cm.userId === currentUser.id ||
                  perms.includes("case.finalize") ||
                  perms.includes("case.delete") ||
                  perms.includes("case.edit_all");

                const isEditingThis = editingCommentId === cm.id;

                return (
                  <div
                    key={cm.id}
                    className="p-3 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {cm.user.fullName} (@{cm.user.username})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(cm.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {canModifyComment && !isEditingThis && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditComment(cm.id, cm.content)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            title="Ubah Catatan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(cm.id)}
                            disabled={deletingCommentId === cm.id}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingThis ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full p-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingComment}
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditCommentText("");
                            }}
                            className="px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingComment || !editCommentText.trim()}
                            onClick={() => handleSaveEditComment(cm.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-800 text-white hover:bg-blue-900 flex items-center gap-1 disabled:opacity-50"
                          >
                            {isUpdatingComment && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {cm.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kasus */}
      {isDeleteCaseOpen && (
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
                  if (!isDeletingCase) setIsDeleteCaseOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus dossier kasus{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {caseData.caseNumber}
              </strong>{" "}
              (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {caseData.productName}
              </span>
              )? Tindakan ini akan menghapus seluruh data formulir, snapshot analisis, dan catatan telaah secara permanen.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingCase}
                onClick={() => setIsDeleteCaseOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingCase}
                onClick={handleDeleteCase}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingCase ? (
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
