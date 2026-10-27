"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Trash2,
} from "lucide-react";
import {
  updateSystemSettingsAction,
  triggerBackupAction,
  deleteBackupAction,
  BackupFileInfo,
} from "@/server/actions/settings";

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  initialBackups: BackupFileInfo[];
}

export function SettingsClient({
  initialSettings,
  initialBackups,
}: SettingsClientProps) {
  const router = useRouter();

  const [settings, setSettings] = useState({
    agency_name:
      initialSettings.agency_name ||
      "Badan Pengawas Obat dan Makanan (BPOM) RI",
    default_letter_number:
      initialSettings.default_letter_number || "B-RG.01.02.3.32.10.26.0452",
    signatory_name:
      initialSettings.signatory_name || "Dr. Dra. Nurul Hidayati, Apt., M.Si.",
    signatory_title:
      initialSettings.signatory_title ||
      "Koordinator Kelompok Substansi Penilaian Mutu Obat Jadi",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateSystemSettingsAction(settings);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg("Pengaturan instansi dan surat berhasil diperbarui.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await triggerBackupAction();
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Database berhasil dicadangkan.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mencadangkan database.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const [deletingBackupName, setDeletingBackupName] = useState<string | null>(null);

  const handleDeleteBackup = async (fileName: string) => {
    if (!confirm(`Hapus berkas cadangan '${fileName}' secara permanen?`)) return;
    setDeletingBackupName(fileName);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await deleteBackupAction(fileName);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Berkas cadangan berhasil dihapus.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus berkas cadangan.");
    } finally {
      setDeletingBackupName(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Pengaturan Sistem & Cadangan Database
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola identitas instansi, format surat resmi, dan cadangkan file database SQLite lokal
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Pengaturan Surat */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            Pengaturan Surat Dinas Resmi & Instansi
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Instansi
              </label>
              <input
                type="text"
                required
                value={settings.agency_name}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, agency_name: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Format / Nomor Surat Default
              </label>
              <input
                type="text"
                required
                value={settings.default_letter_number}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    default_letter_number: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Pejabat Penandatangan
              </label>
              <input
                type="text"
                required
                value={settings.signatory_name}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    signatory_name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Jabatan Penandatangan
              </label>
              <input
                type="text"
                required
                value={settings.signatory_title}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    signatory_title: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cadangan Database Panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-blue-800 dark:text-blue-400" />
              <span>Cadangan Database Lokal</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Snapshot database tersimpan ke direktori <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">./data/backup/</code>. Tombol di bawah ini membuat cadangan langsung (file <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.sql</code>).
            </p>

            <button
              onClick={handleTriggerBackup}
              disabled={isBackingUp}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat Cadangan...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Cadangkan Database Sekarang</span>
                </>
              )}
            </button>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
              CLI: Anda juga dapat menjalankan <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">npm run backup</code> langsung dari terminal.
            </div>
          </div>

          {/* Daftar File Cadangan */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Riwayat File Cadangan ({initialBackups.length})
            </h3>

            {initialBackups.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada berkas cadangan di ./data/backup/
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {initialBackups.map((b) => (
                  <div
                    key={b.fileName}
                    className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {b.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(b.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {b.sizeFormatted}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(b.fileName)}
                        disabled={deletingBackupName === b.fileName}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition disabled:opacity-50"
                        title={`Hapus berkas cadangan ${b.fileName}`}
                      >
                        {deletingBackupName === b.fileName ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
