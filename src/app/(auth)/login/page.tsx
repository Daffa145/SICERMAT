"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/server/actions/auth";
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.success) {
        setErrorMessage(result.message || "Gagal masuk ke sistem.");
        return;
      }

      if (result.data?.mustChangePassword) {
        router.push("/ganti-password");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    });
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Masuk ke Akun
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gunakan nama pengguna dan kata sandi yang telah diberikan oleh Administrator.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Nama Pengguna
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              disabled={isPending}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. kepala_evaluator atau evaluator1"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 dark:focus:ring-blue-600 transition disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={isPending}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 dark:focus:ring-blue-600 transition disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-medium rounded transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi...</span>
            </>
          ) : (
            <span>Masuk</span>
          )}
        </button>
      </form>

      {/* Panel Bantuan Akun Uji Coba */}
      <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Akun Bawaan Sistem (Klik untuk Isi Cepat)
          </h3>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => handleQuickFill("kepala_evaluator", "KepalaPassword123!")}
            className="w-full text-left p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center justify-between group"
          >
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Kepala Evaluator
              </span>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                Review teknis, finalisasi dossier & audit
              </span>
            </div>
            <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono">
              kepala_evaluator
            </code>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("evaluator1", "EvaluatorPassword123!")}
            className="w-full text-left p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center justify-between group"
          >
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Evaluator
              </span>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                Input data, analisis CTD, ekspor dokumen
              </span>
            </div>
            <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono">
              evaluator1
            </code>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("pengamat1", "PengamatPassword123!")}
            className="w-full text-left p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center justify-between group"
          >
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Pengamat
              </span>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                Hanya melihat kasus & unduh laporan
              </span>
            </div>
            <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-mono">
              pengamat1
            </code>
          </button>
        </div>
      </div>
    </div>
  );
}
