import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { listBackupsAction } from "@/server/actions/settings";
import { AccessDenied } from "@/components/access-denied";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.permissions.includes("settings.manage")) {
    return (
      <AccessDenied
        permission="settings.manage"
        title="Akses Pengaturan & Cadangan Ditolak"
        message="Akun Anda tidak memiliki wewenang untuk mengubah pengaturan instansi atau mengelola cadangan basis data."
      />
    );
  }

  const [settings, backups] = await Promise.all([
    prisma.systemSetting.findMany(),
    listBackupsAction(),
  ]);

  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.key, s.value])
  );

  return (
    <div className="space-y-4">
      <SettingsClient initialSettings={settingsMap} initialBackups={backups} />
    </div>
  );
}
