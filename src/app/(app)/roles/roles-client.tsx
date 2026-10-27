"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Award,
  UserCheck,
  Eye,
  Search,
  Check,
  SlidersHorizontal,
  History,
  Users,
  FolderGit2,
  KeyRound,
  RotateCcw,
  Edit2,
  Trash2,
  Info,
} from "lucide-react";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  savePermissionsMatrixAction,
} from "@/server/actions/roles";

interface PermissionDef {
  id: string;
  code: string;
  module: string;
  name: string;
  description: string | null;
}

interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: {
    permission: {
      id: string;
      code: string;
    };
  }[];
}

interface RolesClientProps {
  roles: RoleWithPermissions[];
  permissions: PermissionDef[];
  currentUser: {
    id: string;
    permissions: string[];
  };
}

// Icon dan palet warna peran
const ROLE_THEMES: Record<
  string,
  {
    icon: React.ElementType;
    badgeBg: string;
    badgeText: string;
    borderCol: string;
    activeText: string;
    avatarBg: string;
  }
> = {
  Administrator: {
    icon: ShieldCheck,
    badgeBg: "bg-purple-100 dark:bg-purple-950/70",
    badgeText: "text-purple-700 dark:text-purple-300",
    borderCol: "border-purple-300 dark:border-purple-800",
    activeText: "text-purple-600 dark:text-purple-400",
    avatarBg: "bg-purple-600 text-white",
  },
  "Kepala Evaluator": {
    icon: Award,
    badgeBg: "bg-sky-100 dark:bg-sky-950/70",
    badgeText: "text-sky-700 dark:text-sky-300",
    borderCol: "border-sky-300 dark:border-sky-800",
    activeText: "text-sky-600 dark:text-sky-400",
    avatarBg: "bg-sky-600 text-white",
  },
  Evaluator: {
    icon: UserCheck,
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/70",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderCol: "border-emerald-300 dark:border-emerald-800",
    activeText: "text-emerald-600 dark:text-emerald-400",
    avatarBg: "bg-emerald-600 text-white",
  },
  Pengamat: {
    icon: Eye,
    badgeBg: "bg-amber-100 dark:bg-amber-950/70",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderCol: "border-amber-300 dark:border-amber-800",
    activeText: "text-amber-600 dark:text-amber-400",
    avatarBg: "bg-amber-600 text-white",
  },
};

const DEFAULT_THEME = {
  icon: KeyRound,
  badgeBg: "bg-blue-100 dark:bg-blue-950/70",
  badgeText: "text-blue-700 dark:text-blue-300",
  borderCol: "border-blue-300 dark:border-blue-800",
  activeText: "text-blue-600 dark:text-blue-400",
  avatarBg: "bg-blue-600 text-white",
};

export function RolesClient({ roles, permissions, currentUser }: RolesClientProps) {
  const router = useRouter();
  const canManage = currentUser.permissions.includes("role.manage");

  // Inisialisasi matriks peran -> array kode permission
  const initialMatrix = useMemo(() => {
    const res: Record<string, string[]> = {};
    roles.forEach((r) => {
      res[r.id] = r.permissions.map((p) => p.permission.code);
    });
    return res;
  }, [roles]);

  const [matrix, setMatrix] = useState<Record<string, string[]>>(initialMatrix);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal create / edit / delete role
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [editRoleDesc, setEditRoleDesc] = useState("");
  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(null);

  // Hitung jumlah perubahan (dirty check)
  const unsavedChangesCount = useMemo(() => {
    let diff = 0;
    roles.forEach((r) => {
      const initCodes = new Set(initialMatrix[r.id] || []);
      const currCodes = new Set(matrix[r.id] || []);
      // Yang baru dicentang
      currCodes.forEach((c) => {
        if (!initCodes.has(c)) diff++;
      });
      // Yang dicabut
      initCodes.forEach((c) => {
        if (!currCodes.has(c)) diff++;
      });
    });
    return diff;
  }, [roles, initialMatrix, matrix]);

  // Kelompokkan nama & icon modul
  const moduleMeta: Record<
    string,
    { title: string; desc: string; icon: React.ElementType }
  > = {
    case: {
      title: "Manajemen Kasus (Dossier)",
      desc: "Hak akses penelaahan berkas, validasi form, dan pembuatan surat",
      icon: FolderGit2,
    },
    user: {
      title: "Manajemen Pengguna",
      desc: "Pengelolaan profil, pembuatan akun, dan reset kredensial",
      icon: Users,
    },
    role: {
      title: "Peran & Hak Akses (RBAC)",
      desc: "Konfigurasi matriks wewenang peran dan struktur otorisasi",
      icon: KeyRound,
    },
    audit: {
      title: "Audit Trail",
      desc: "Pemantauan rekam jejak aktivitas, mutasi data, dan keamanan",
      icon: History,
    },
    settings: {
      title: "Pengaturan & Cadangan",
      desc: "Konfigurasi instansi, pejabat berwenang, dan pencadangan data",
      icon: SlidersHorizontal,
    },
  };

  // Kelompokkan permissions per modul
  const groupedPermissions = useMemo(() => {
    const res: Record<string, PermissionDef[]> = {};
    permissions.forEach((p) => {
      if (!res[p.module]) {
        res[p.module] = [];
      }
      res[p.module].push(p);
    });
    return res;
  }, [permissions]);

  // Filter berdasarkan modul dan pencarian
  const filteredGroups = useMemo(() => {
    const targetGroups: Record<string, PermissionDef[]> = {};
    const query = searchQuery.trim().toLowerCase();

    Object.entries(groupedPermissions).forEach(([mod, perms]) => {
      if (selectedModule !== "ALL" && selectedModule !== mod) return;

      const matchedPerms = perms.filter((p) => {
        if (!query) return true;
        return (
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      });

      if (matchedPerms.length > 0) {
        targetGroups[mod] = matchedPerms;
      }
    });

    return targetGroups;
  }, [groupedPermissions, selectedModule, searchQuery]);

  // Toggle satu checkbox permission
  const togglePermission = (roleId: string, permCode: string) => {
    if (!canManage) return;

    setMatrix((prev) => {
      const currentCodes = prev[roleId] || [];
      const hasCode = currentCodes.includes(permCode);
      const updated = hasCode
        ? currentCodes.filter((c) => c !== permCode)
        : [...currentCodes, permCode];

      return { ...prev, [roleId]: updated };
    });
  };

  // Toggle semua izin untuk satu peran dalam satu modul
  const toggleModulePermissionsForRole = (
    roleId: string,
    perms: PermissionDef[]
  ) => {
    if (!canManage) return;

    setMatrix((prev) => {
      const currentCodes = new Set(prev[roleId] || []);
      const permCodes = perms.map((p) => p.code);
      const allSelected = permCodes.every((c) => currentCodes.has(c));

      if (allSelected) {
        // Hapus semua dari modul ini
        permCodes.forEach((c) => currentCodes.delete(c));
      } else {
        // Pilih semua dari modul ini
        permCodes.forEach((c) => currentCodes.add(c));
      }

      return { ...prev, [roleId]: Array.from(currentCodes) };
    });
  };

  // Reset perubahan matriks kembali ke kondisi awal
  const handleResetMatrix = () => {
    setMatrix(initialMatrix);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveMatrix = async () => {
    setIsPending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await savePermissionsMatrixAction(matrix);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Matriks hak akses berhasil disimpan.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan matriks.");
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await createRoleAction({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
      });
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Peran baru berhasil dibuat.");
      setIsCreateRoleOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat peran.");
    } finally {
      setIsPending(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await updateRoleAction(editingRole.id, {
        name: editingRole.name,
        description: editRoleDesc,
      });
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Peran berhasil diperbarui.");
      setEditingRole(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui peran.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await deleteRoleAction(deletingRole.id);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Peran berhasil dihapus.");
      setDeletingRole(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus peran.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Informasi & Tindakan Utama */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400">
                <KeyRound className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Matriks Peran & Hak Akses (RBAC)
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kelola wewenang setiap peran secara dinamis. Centang hak akses yang diizinkan lalu klik simpan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                {unsavedChangesCount > 0 && (
                  <button
                    onClick={handleResetMatrix}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                    title="Batalkan perubahan yang belum disimpan"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                )}

                <button
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Peran</span>
                </button>

                <button
                  onClick={handleSaveMatrix}
                  disabled={isPending || unsavedChangesCount === 0}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition flex items-center gap-1.5 shadow-sm ${
                    unsavedChangesCount > 0
                      ? "bg-blue-800 hover:bg-blue-900 ring-2 ring-blue-500/30 animate-pulse"
                      : "bg-blue-800 hover:bg-blue-900 disabled:opacity-50"
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Simpan Matriks
                    {unsavedChangesCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px]">
                        {unsavedChangesCount}
                      </span>
                    )}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Peringatan perubahan belum disimpan */}
        {unsavedChangesCount > 0 && (
          <div className="mt-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Terdapat <b>{unsavedChangesCount} hak akses</b> yang telah diubah. Jangan lupa klik tombol <b>Simpan Matriks</b> agar diterapkan.
              </span>
            </div>
            <button
              onClick={handleSaveMatrix}
              disabled={isPending}
              className="font-semibold underline hover:no-underline ml-2"
            >
              Simpan Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Pesan Kesalahan / Keberhasilan */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Kartu Ringkasan Peran (Role Persona Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {roles.map((r) => {
          const theme = ROLE_THEMES[r.name] || DEFAULT_THEME;
          const RoleIcon = theme.icon;
          const grantedCount = (matrix[r.id] || []).length;
          const totalCount = permissions.length;
          const percentage = Math.round((grantedCount / totalCount) * 100);

          return (
            <div
              key={r.id}
              className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 transition hover:shadow-xs flex flex-col justify-between ${theme.borderCol}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${theme.avatarBg}`}
                    >
                      <RoleIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span>{r.name}</span>
                        {r.isSystem && (
                          <span title="Peran Sistem Bawaan">
                            <Lock className="w-3 h-3 text-slate-400" />
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.badgeBg} ${theme.badgeText}`}
                  >
                    {grantedCount} Izin
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {r.description || "Peran pengguna dalam alur evaluasi dossier obat."}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                {/* Progress bar kepemilikan izin */}
                <div className="flex items-center gap-1.5 flex-1 pr-2">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-800 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {percentage}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingRole(r);
                      setEditRoleDesc(r.description || "");
                    }}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                    title="Ubah Deskripsi Peran"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!r.isSystem && canManage && (
                    <button
                      onClick={() => setDeletingRole(r)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500 hover:text-red-700 transition"
                      title="Hapus Peran"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Filter Toolbar (Pencarian & Modul Pills) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari izin... (contoh: ubah, buat, ekspor)"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Petunjuk:</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
              <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              Aktif
            </span>
            <span>dan klik untuk beralih</span>
          </div>
        </div>

        {/* Tab Kategori Modul */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setSelectedModule("ALL")}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedModule === "ALL"
                ? "bg-blue-800 text-white shadow-xs font-semibold"
                : "bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <span>Semua Modul</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedModule === "ALL"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {permissions.length}
            </span>
          </button>

          {Object.entries(groupedPermissions).map(([mod, perms]) => {
            const meta = moduleMeta[mod] || {
              title: mod,
              icon: KeyRound,
            };
            const ModIcon = meta.icon;
            const isSelected = selectedModule === mod;

            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-800 text-white shadow-xs font-semibold"
                    : "bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <ModIcon className="w-3.5 h-3.5" />
                <span>{meta.title}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {perms.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tabel Matriks Hak Akses Terstruktur */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300">
                <th className="py-3 px-4 w-[42%] min-w-[300px] font-semibold text-[11px] uppercase tracking-wider">
                  Modul & Wewenang (Hak Akses)
                </th>

                {roles.map((r) => {
                  const theme = ROLE_THEMES[r.name] || DEFAULT_THEME;
                  const RoleIcon = theme.icon;

                  return (
                    <th
                      key={r.id}
                      className="py-3 px-3 text-center min-w-[130px] border-l border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          <RoleIcon className={`w-3.5 h-3.5 ${theme.activeText}`} />
                          <span>{r.name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${theme.badgeBg} ${theme.badgeText}`}
                        >
                          {(matrix[r.id] || []).length} Aktif
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {Object.keys(filteredGroups).length === 0 ? (
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="py-12 text-center text-slate-400 dark:text-slate-500"
                  >
                    Tidak ada hak akses yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              ) : (
                Object.entries(filteredGroups).map(([mod, perms]) => {
                  const meta = moduleMeta[mod] || {
                    title: mod,
                    desc: "",
                    icon: KeyRound,
                  };
                  const ModIcon = meta.icon;

                  return (
                    <React.Fragment key={mod}>
                      {/* Section Header Modul */}
                      <tr className="bg-slate-100/70 dark:bg-slate-800/50">
                        <td className="py-2.5 px-4 font-bold text-xs text-blue-900 dark:text-blue-300">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 shadow-xs">
                              <ModIcon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <span>{meta.title}</span>
                              {meta.desc && (
                                <p className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                  {meta.desc}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tombol Cepat: Pilih / Kosongkan Seluruh Modul per Peran */}
                        {roles.map((r) => {
                          const currentCodes = matrix[r.id] || [];
                          const modCodes = perms.map((p) => p.code);
                          const allChecked = modCodes.every((c) =>
                            currentCodes.includes(c)
                          );

                          return (
                            <td
                              key={r.id}
                              className="py-1 px-2 text-center border-l border-slate-200/70 dark:border-slate-800"
                            >
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleModulePermissionsForRole(r.id, perms)
                                  }
                                  className="text-[10px] text-slate-500 hover:text-blue-800 dark:hover:text-blue-400 hover:underline px-1.5 py-0.5 rounded transition"
                                  title={
                                    allChecked
                                      ? "Hapus centang semua izin modul ini"
                                      : "Pilih semua izin modul ini"
                                  }
                                >
                                  {allChecked ? "Batal Semua" : "Pilih Semua"}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Baris Permission dalam Modul */}
                      {perms.map((p) => (
                        <tr
                          key={p.code}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group"
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-colors">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {p.description}
                                </div>
                              </div>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                                {p.code}
                              </span>
                            </div>
                          </td>

                          {roles.map((r) => {
                            const isChecked = (matrix[r.id] || []).includes(p.code);

                            return (
                              <td
                                key={r.id}
                                onClick={() => togglePermission(r.id, p.code)}
                                className={`py-2.5 px-3 text-center border-l border-slate-100 dark:border-slate-800 transition ${
                                  canManage
                                    ? "cursor-pointer hover:bg-blue-100/30 dark:hover:bg-blue-900/30"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 ${
                                      isChecked
                                        ? "bg-blue-800 dark:bg-blue-600 text-white shadow-xs scale-105"
                                        : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 group-hover:border-slate-400"
                                    }`}
                                  >
                                    {isChecked && (
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Simpan di Bawah Tabel */}
        {canManage && (
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {unsavedChangesCount > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  Ada {unsavedChangesCount} hak akses belum disimpan.
                </span>
              ) : (
                <span>Semua hak akses sudah tersimpan dan mutakhir.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unsavedChangesCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetMatrix}
                  disabled={isPending}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                >
                  Batalkan Perubahan
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={isPending || unsavedChangesCount === 0}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Perubahan Matriks</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Tambah Peran Baru */}
      {isCreateRoleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Tambah Peran (Role) Baru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Buat peran baru untuk mengelompokkan wewenang pengguna.
            </p>

            <form onSubmit={handleCreateRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Peran *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="mis. Asisten Evaluator"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Deskripsi Tugas
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Jelaskan wewenang atau tanggung jawab peran ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-800 hover:bg-blue-900 text-white disabled:opacity-50 flex items-center gap-1.5 transition shadow-xs"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Buat Peran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Edit Deskripsi Peran */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Ubah Deskripsi: {editingRole.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Perbarui rincian tanggung jawab peran dalam institusi.
            </p>

            <form onSubmit={handleUpdateRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Deskripsi Tugas
                </label>
                <textarea
                  rows={3}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-3.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-800 hover:bg-blue-900 text-white disabled:opacity-50 flex items-center gap-1.5 transition shadow-xs"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Konfirmasi Hapus Peran */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
              Konfirmasi Hapus Peran
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus peran kustom <b>{deletingRole.name}</b>? Tindakan ini akan menghapus seluruh pemetaan hak akses untuk peran ini.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="px-3.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-800 text-white disabled:opacity-50 flex items-center gap-1.5 transition shadow-xs"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
