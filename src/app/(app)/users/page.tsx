import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { AccessDenied } from "@/components/access-denied";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.permissions.includes("user.view")) {
    return (
      <AccessDenied
        permission="user.view"
        title="Akses Manajemen Pengguna Ditolak"
        message="Akun Anda tidak memiliki wewenang untuk melihat atau mengelola daftar akun pengguna sistem."
      />
    );
  }

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <UsersClient
        users={users as any}
        roles={roles}
        currentUser={currentUser}
      />
    </div>
  );
}
