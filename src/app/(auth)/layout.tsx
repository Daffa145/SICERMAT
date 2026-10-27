import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-900 dark:bg-slate-800 border border-slate-700 text-blue-400 mb-3 shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            CERMAT
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-medium">
            Compliance Evaluation & Review Mutu
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Modul 3 (Mutu) • PerKa BPOM No. 24/2017 jo. No. 23/2025
          </p>
        </div>

        {children}

        <div className="text-center mt-8 text-[11px] text-slate-400 dark:text-slate-600">
          Sistem Internal Penilaian Dokumen Registrasi Obat Jadi • Akses Terbatas
        </div>
      </div>
    </div>
  );
}
