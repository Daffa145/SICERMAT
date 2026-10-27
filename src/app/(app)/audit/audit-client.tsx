"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/pagination";
import {
  Search,
  Info,
  X,
} from "lucide-react";

interface AuditItem {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { fullName: string } | null;
}

interface AuditClientProps {
  logs: AuditItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize?: number;
  usersList: { username: string; fullName: string }[];
  actionsList: string[];
  currentFilter: {
    q: string;
    username: string;
    action: string;
    date: string;
  };
}

export function AuditClient({
  logs,
  totalItems,
  totalPages: _totalPages,
  currentPage,
  pageSize = 8,
  usersList,
  actionsList,
  currentFilter,
}: AuditClientProps) {
  const router = useRouter();

  const [q, setQ] = useState(currentFilter.q);
  const [selectedUser, setSelectedUser] = useState(currentFilter.username);
  const [selectedAction, setSelectedAction] = useState(currentFilter.action);
  const [selectedDate, setSelectedDate] = useState(currentFilter.date);

  const [inspectLog, setInspectLog] = useState<AuditItem | null>(null);

  const applyFilters = (overrides?: Partial<typeof currentFilter>) => {
    const params = new URLSearchParams();
    const query = overrides?.q !== undefined ? overrides.q : q;
    const usr =
      overrides?.username !== undefined ? overrides.username : selectedUser;
    const act =
      overrides?.action !== undefined ? overrides.action : selectedAction;
    const dt = overrides?.date !== undefined ? overrides.date : selectedDate;

    if (query) params.set("q", query);
    if (usr) params.set("username", usr);
    if (act) params.set("action", act);
    if (dt) params.set("date", dt);
    params.set("page", "1");

    router.push(`/audit?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q });
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`/audit?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("limit", String(newSize));
    params.set("page", "1");
    router.push(`/audit?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Audit Trail (Rekam Jejak Sistem)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan riwayat aktivitas, otorisasi, mutasi data, dan ekspor berkas secara permanen (read-only)
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari ringkasan / objek..."
              className="w-full pl-8 pr-16 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1 top-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                applyFilters({ date: e.target.value });
              }}
              className="text-xs py-1 px-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            />

            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                applyFilters({ username: e.target.value });
              }}
              className="text-xs py-1.5 px-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="">Semua Pengguna</option>
              {usersList.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.fullName} (@{u.username})
                </option>
              ))}
            </select>

            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                applyFilters({ action: e.target.value });
              }}
              className="text-xs py-1.5 px-2.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="">Semua Aksi</option>
              {actionsList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {(q || selectedUser || selectedAction || selectedDate) && (
              <button
                onClick={() => {
                  setQ("");
                  setSelectedUser("");
                  setSelectedAction("");
                  setSelectedDate("");
                  router.push("/audit");
                }}
                className="text-xs text-blue-800 dark:text-blue-400 hover:underline px-2"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-2.5 px-3 whitespace-nowrap">Waktu</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Pengguna</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Aksi</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Entitas</th>
                <th className="py-2.5 px-3">Ringkasan Aktivitas</th>
                <th className="py-2.5 px-3 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {new Date(l.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {l.user?.fullName || l.username}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 ml-1">
                        (@{l.username})
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] font-medium text-blue-900 dark:text-blue-300">
                      {l.action}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {l.entity}
                    </td>
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                      {l.summary}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {l.details ? (
                        <button
                          onClick={() => setInspectLog(l)}
                          className="p-1 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400"
                          title="Lihat Detail JSON"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
          itemName="catatan audit"
          pageSizeOptions={[5, 8, 10, 20, 50]}
        />
      </div>

      {/* Modal Detail JSON */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 max-w-lg w-full shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {inspectLog.action}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {inspectLog.summary}
                </p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto max-h-72">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(inspectLog.details || "{}"), null, 2);
                } catch {
                  return inspectLog.details;
                }
              })()}
            </pre>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setInspectLog(null)}
                className="px-3 py-1.5 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditClient;
