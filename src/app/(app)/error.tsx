"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Exception:", error);
  }, [error]);

  const is403 =
    error.message?.includes("Akses ditolak") ||
    error.name === "ForbiddenError";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {is403 ? "Akses Ditolak (403)" : "Terjadi Kendala pada Sistem"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {is403
              ? "Anda tidak memiliki hak akses yang cukup untuk membuka atau mengubah data ini."
              : error.message ||
                "Aplikasi mengalami pengecualian saat memproses permintaan."}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 pt-1">
              Kode Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => reset()}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
