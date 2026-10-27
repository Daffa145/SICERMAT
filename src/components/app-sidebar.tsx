"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { logoutAction } from "@/server/actions/auth";
import {
  FileText,
  PlusCircle,
  Users,
  ShieldCheck,
  History,
  Settings,
  LayoutDashboard,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface AppSidebarProps {
  user: {
    username: string;
    fullName: string;
    roleName: string;
    permissions: string[];
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const perms = user.permissions;
  const canViewCases = perms.includes("case.view_own") || perms.includes("case.view_all");
  const canCreateCase = perms.includes("case.create");
  const canViewUsers = perms.includes("user.view");
  const canViewRoles = perms.includes("role.view");
  const canViewAudit = perms.includes("audit.view");
  const canManageSettings = perms.includes("settings.manage");

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Daftar Kasus",
      href: "/cases",
      icon: FileText,
      show: canViewCases,
    },
    {
      label: "Kasus Baru",
      href: "/cases/new",
      icon: PlusCircle,
      show: canCreateCase,
    },
    {
      label: "Pengguna",
      href: "/users",
      icon: Users,
      show: canViewUsers,
    },
    {
      label: "Role & Hak Akses",
      href: "/roles",
      icon: ShieldCheck,
      show: canViewRoles,
    },
    {
      label: "Audit Trail",
      href: "/audit",
      icon: History,
      show: canViewAudit,
    },
    {
      label: "Pengaturan & Backup",
      href: "/settings",
      icon: Settings,
      show: canManageSettings,
    },
  ];

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="font-bold tracking-tight text-sm">CERMAT</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs"
            title="Ganti Tema"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {user.roleName}
          </span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Fixed Narrow Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Area */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">
                CERMAT
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-blue-900 text-blue-200 rounded">
                CTD Mutu
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compliance Evaluation & Review Mutu
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="text-xs font-semibold text-slate-100 truncate">
            {user.fullName}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              @{user.username}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {user.roleName}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                    active
                      ? "bg-blue-800 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span>{item.label}</span>
                </a>
              );
            })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1.5 text-xs">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>Mode {theme === "dark" ? "Terang" : "Gelap"}</span>
            </span>
            <span className="text-[10px] uppercase font-mono text-slate-400">
              {theme}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
}
