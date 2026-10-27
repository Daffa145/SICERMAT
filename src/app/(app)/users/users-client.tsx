"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/pagination";
import {
  UserPlus,
  KeyRound,
  UserX,
  UserCheck,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import {
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
  deactivateUserAction,
  activateUserAction,
  deleteUserAction,
} from "@/server/actions/users";

interface UserItem {
  id: string;
  username: string;
  fullName: string;
  nip: string | null;
  roleId: string;
  role: { id: string; name: string };
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
}

interface UsersClientProps {
  users: UserItem[];
  roles: RoleItem[];
  currentUser: {
    id: string;
    permissions: string[];
  };
}

export function UsersClient({ users, roles, currentUser }: UsersClientProps) {
  const router = useRouter();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    username: "",
    fullName: "",
    nip: "",
    password: "",
    roleId: roles[0]?.id || "",
    mustChangePassword: true,
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    nip: "",
    roleId: "",
    isActive: true,
    mustChangePassword: false,
  });

  const [newPassword, setNewPassword] = useState("");

  // Pagination untuk Daftar Pengguna
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(8);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return users.slice(start, start + userPageSize);
  }, [users, userPage, userPageSize]);

  const perms = currentUser.permissions;
  const canCreate = perms.includes("user.create");
  const canEdit = perms.includes("user.edit");
  const canDeactivate = perms.includes("user.deactivate");

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsPending(true);

    try {
      const res = await createUserAction(addForm);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Pengguna berhasil ditambahkan.");
      setIsAddOpen(false);
      setAddForm({
        username: "",
        fullName: "",
        nip: "",
        password: "",
        roleId: roles[0]?.id || "",
        mustChangePassword: true,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat pengguna.");
    } finally {
      setIsPending(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    clearMessages();
    setIsPending(true);

    try {
      const res = await updateUserAction(editingUser.id, editForm);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Pengguna berhasil diperbarui.");
      setEditingUser(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui pengguna.");
    } finally {
      setIsPending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    clearMessages();
    setIsPending(true);

    try {
      const res = await resetUserPasswordAction(resettingUser.id, newPassword);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Kata sandi berhasil direset.");
      setResettingUser(null);
      setNewPassword("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mereset kata sandi.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingUser) return;
    clearMessages();
    setIsPending(true);

    try {
      const res = await deactivateUserAction(deactivatingUser.id);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Pengguna berhasil dinonaktifkan.");
      setDeactivatingUser(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menonaktifkan pengguna.");
    } finally {
      setIsPending(false);
    }
  };

  const handleActivateUser = async (u: UserItem) => {
    setIsPending(true);
    clearMessages();
    try {
      const res = await activateUserAction(u.id);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Pengguna berhasil diaktifkan kembali.");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengaktifkan pengguna.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsPending(true);
    clearMessages();
    try {
      const res = await deleteUserAction(deletingUser.id);
      if (!res.success) throw new Error(res.message);
      setSuccessMsg(res.message || "Pengguna berhasil dihapus.");
      setDeletingUser(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus pengguna.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Daftar Akun Pengguna Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola akun evaluator, hak akses peran, dan keamanan kredensial
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              clearMessages();
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Pengguna</span>
          </button>
        )}
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

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">Nama Pengguna</th>
                <th className="py-2.5 px-3">Nama Lengkap & NIP</th>
                <th className="py-2.5 px-3">Peran (Role)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Keamanan</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada akun pengguna yang terdaftar.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      @{u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {u.fullName}
                      </div>
                      {u.nip && (
                        <div className="text-[11px] font-mono text-slate-400">
                          NIP: {u.nip}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {u.role.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {u.mustChangePassword ? (
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          Wajib ganti password
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Normal</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                clearMessages();
                                setEditingUser(u);
                                setEditForm({
                                  fullName: u.fullName,
                                  nip: u.nip || "",
                                  roleId: u.roleId,
                                  isActive: u.isActive,
                                  mustChangePassword: u.mustChangePassword,
                                });
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              title="Ubah Profil Pengguna"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                clearMessages();
                                setResettingUser(u);
                                setNewPassword("");
                              }}
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400"
                              title="Reset Kata Sandi"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {canDeactivate &&
                          (u.isActive ? (
                            <button
                              onClick={() => {
                                clearMessages();
                                setDeactivatingUser(u);
                              }}
                              className="p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 hover:text-amber-800 dark:hover:text-amber-400"
                              title="Nonaktifkan Pengguna"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(u)}
                              disabled={isPending}
                              className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400 disabled:opacity-50"
                              title="Aktifkan Kembali Pengguna"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          ))}

                        {canEdit && u.id !== currentUser.id && (
                          <button
                            onClick={() => {
                              clearMessages();
                              setDeletingUser(u);
                            }}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Hapus Pengguna Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={userPage}
          totalItems={users.length}
          pageSize={userPageSize}
          onPageChange={setUserPage}
          onPageSizeChange={(sz) => {
            setUserPageSize(sz);
            setUserPage(1);
          }}
          itemName="pengguna sistem"
          pageSizeOptions={[5, 8, 10, 20]}
        />
      </div>

      {/* Modal Tambah Pengguna */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tambah Akun Pengguna Baru
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengguna (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="mis. evaluator2"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  placeholder="mis. Budi Santoso, S.Farm., Apt."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  NIP Pegawai (Opsional)
                </label>
                <input
                  type="text"
                  value={addForm.nip}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, nip: e.target.value }))
                  }
                  placeholder="mis. 199001012015031001"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Awal (min. 10 karakter) *
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Minimal 10 karakter"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role) *
                </label>
                <select
                  value={addForm.roleId}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, roleId: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mustChange"
                  checked={addForm.mustChangePassword}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      mustChangePassword: e.target.checked,
                    }))
                  }
                  className="accent-blue-800 rounded"
                />
                <label
                  htmlFor="mustChange"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Wajibkan ganti kata sandi saat login pertama
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ubah Pengguna @{editingUser.username}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={editForm.nip}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, nip: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Peran (Role)
                </label>
                <select
                  value={editForm.roleId}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, roleId: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="accent-blue-800 rounded"
                />
                <label
                  htmlFor="editIsActive"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Akun berstatus Aktif
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editMustChange"
                  checked={editForm.mustChangePassword}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      mustChangePassword: e.target.checked,
                    }))
                  }
                  className="accent-blue-800 rounded"
                />
                <label
                  htmlFor="editMustChange"
                  className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Wajibkan ganti kata sandi pada login berikutnya
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Reset Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Masukkan kata sandi baru untuk pengguna <b>@{resettingUser.username}</b> (minimal 10 karakter).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 10 karakter"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Nonaktifkan */}
      {deactivatingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
              Konfirmasi Nonaktifkan Pengguna
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan akun <b>@{deactivatingUser.username}</b> ({deactivatingUser.fullName})? Pengguna ini tidak akan dapat masuk ke sistem.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeactivatingUser(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Nonaktifkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna Permanen */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-sm w-full shadow-lg space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hapus Pengguna Permanen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isPending) setDeletingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pengguna{" "}
              <b className="font-mono text-slate-900 dark:text-slate-100">
                @{deletingUser.username}
              </b>{" "}
              ({deletingUser.fullName})?
            </p>

            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
              Perhatian: Pengguna yang sudah memiliki riwayat telaah atau kasus tidak dapat dihapus permanen demi audit trail regulasi.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? (
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
