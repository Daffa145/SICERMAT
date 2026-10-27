"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/server/actions/auth";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function GantiPasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePasswordAction(formData);

      if (!result.success) {
        setErrorMessage(result.message || "Gagal mengubah kata sandi.");
        return;
      }

      setSuccessMessage("Kata sandi berhasil diperbarui. Mengalihkan ke dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Ganti Kata Sandi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Anda diwajibkan untuk memperbarui kata sandi akun Anda demi keamanan (minimal 10 karakter).
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="leading-relaxed">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="oldPassword"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Kata Sandi Saat Ini
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              required
              disabled={isPending}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 dark:focus:ring-blue-600 transition disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Kata Sandi Baru (min. 10 karakter)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={10}
              required
              disabled={isPending}
              placeholder="Minimal 10 karakter"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 dark:focus:ring-blue-600 transition disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Konfirmasi Kata Sandi Baru
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={10}
              required
              disabled={isPending}
              placeholder="Ulangi kata sandi baru"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-800 dark:focus:ring-blue-600 transition disabled:opacity-60"
            />
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
              <span>Menyimpan Kata Sandi...</span>
            </>
          ) : (
            <span>Simpan Kata Sandi</span>
          )}
        </button>
      </form>
    </div>
  );
}
