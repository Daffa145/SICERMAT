import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { AccessDenied } from "@/components/access-denied";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.permissions.includes("role.view")) {
    return (
      <AccessDenied
        permission="role.view"
        title="Akses Peran & Hak Akses Ditolak"
        message="Akun Anda tidak memiliki wewenang untuk melihat atau mengatur matriks hak akses peran sistem."
      />
    );
  }

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: {
              select: { id: true, code: true },
            },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <RolesClient
        roles={roles as any}
        permissions={permissions as any}
        currentUser={currentUser}
      />
    </div>
  );
}
