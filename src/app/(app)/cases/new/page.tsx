import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac/guard";
import { CaseForm } from "@/components/case-form";
import { AccessDenied } from "@/components/access-denied";
import { ChevronLeft } from "lucide-react";

export default async function NewCasePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.permissions.includes("case.create")) {
    return (
      <AccessDenied
        permission="case.create"
        title="Wewenang Buat Kasus Ditolak"
        message="Akun Anda saat ini tidak memiliki izin untuk membuat dossier kasus baru. Hubungi Administrator untuk memberikan akses 'Buat Kasus Baru' melalui fitur Peran & Hak Akses."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/cases"
          className="hover:underline flex items-center gap-1 text-blue-800 dark:text-blue-400"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Daftar Kasus</span>
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">Buat Kasus Baru</span>
      </div>

      <CaseForm />
    </div>
  );
}
