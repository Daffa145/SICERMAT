import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

interface AccessDeniedProps {
  permission?: string;
  title?: string;
  message?: string;
}

export function AccessDenied({
  permission,
  title = "Akses Ditolak (403)",
  message,
}: AccessDeniedProps) {
  return (
    <div className="max-w-lg mx-auto my-16 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-xl shadow-xs text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center ring-8 ring-red-50 dark:ring-red-950/30">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {message ||
            "Anda tidak memiliki hak wewenang yang diperlukan untuk mengakses atau mengelola fitur ini."}
        </p>

        {permission && (
          <div className="pt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
              Hak Akses Diperlukan: {permission}
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          Hubungi <b>Administrator</b> sistem untuk memberikan hak akses ini melalui menu <b>Peran & Hak Akses (RBAC)</b>.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-800 hover:bg-blue-900 text-white transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Daftar Kasus</span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Beranda Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
