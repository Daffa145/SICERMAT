"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit";
import { ActionResult } from "./auth";

const RoleSchema = z.object({
  name: z.string().min(2, "Nama peran minimal 2 karakter"),
  description: z.string().optional(),
});

export async function createRoleAction(formData: {
  name: string;
  description?: string;
  initialPermissionCodes?: string[];
}): Promise<ActionResult> {
  const actor = await requirePermission("role.manage");

  const parsed = RoleSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data peran tidak valid.",
    };
  }

  const { name, description } = parsed.data;

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    return {
      success: false,
      message: `Peran '${name}' sudah ada.`,
    };
  }

  const newRole = await prisma.role.create({
    data: {
      name,
      description: description || null,
      isSystem: false,
    },
  });

  if (formData.initialPermissionCodes && formData.initialPermissionCodes.length > 0) {
    const permissions = await prisma.permission.findMany({
      where: { code: { in: formData.initialPermissionCodes } },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: newRole.id,
        permissionId: p.id,
      })),
    });
  }

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "ROLE_CREATE",
    entity: "Role",
    entityId: newRole.id,
    summary: `Membuat peran baru: ${name}`,
  });

  return { success: true, message: `Peran '${name}' berhasil dibuat.` };
}

export async function updateRoleAction(
  roleId: string,
  formData: { name: string; description?: string }
): Promise<ActionResult> {
  const actor = await requirePermission("role.manage");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return { success: false, message: "Peran tidak ditemukan." };
  }

  const parsed = RoleSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data peran tidak valid.",
    };
  }

  // Peran sistem tidak boleh diubah namanya
  const newName = role.isSystem ? role.name : parsed.data.name;

  await prisma.role.update({
    where: { id: roleId },
    data: {
      name: newName,
      description: parsed.data.description || null,
    },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "ROLE_UPDATE",
    entity: "Role",
    entityId: roleId,
    summary: `Memperbarui peran: ${newName}`,
  });

  return { success: true, message: `Peran '${newName}' berhasil diperbarui.` };
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  const actor = await requirePermission("role.manage");

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { users: true },
  });

  if (!role) {
    return { success: false, message: "Peran tidak ditemukan." };
  }

  if (role.isSystem) {
    return {
      success: false,
      message: "Peran bawaan sistem tidak dapat dihapus.",
    };
  }

  if (role.users.length > 0) {
    return {
      success: false,
      message: `Peran masih digunakan oleh ${role.users.length} pengguna. Silakan alihkan pengguna terlebih dahulu.`,
    };
  }

  await prisma.role.delete({ where: { id: roleId } });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "ROLE_DELETE",
    entity: "Role",
    entityId: roleId,
    summary: `Menghapus peran: ${role.name}`,
  });

  return { success: true, message: `Peran '${role.name}' berhasil dihapus.` };
}

export async function savePermissionsMatrixAction(
  matrix: Record<string, string[]> // roleId -> array of permission codes
): Promise<ActionResult> {
  const actor = await requirePermission("role.manage");

  // Validasi: pastikan setidaknya satu peran aktif mempertahankan permission 'role.manage'
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  const adminRole = await prisma.role.findFirst({
    where: { name: "Administrator" },
  });

  if (adminRole && matrix[adminRole.id]) {
    const adminPerms = matrix[adminRole.id];
    if (!adminPerms.includes("role.manage")) {
      return {
        success: false,
        message:
          "Tindakan ditolak: Hak akses 'role.manage' tidak boleh dicabut dari peran Administrator untuk mencegah lockout sistem.",
      };
    }
  }

  // Lakukan pembaruan dalam transaksi
  await prisma.$transaction(async (tx) => {
    for (const [roleId, codes] of Object.entries(matrix)) {
      // Hapus semua relasi rolePermission saat ini untuk peran ini
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Tambahkan relasi baru
      const validPermissionIds = codes
        .map((code) => permMap.get(code))
        .filter((id): id is string => Boolean(id));

      if (validPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: validPermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });
      }
    }
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "ROLE_PERMISSIONS_UPDATE",
    entity: "RolePermission",
    summary: "Memperbarui matriks hak akses Role & Permission sistem",
    details: matrix,
  });

  return {
    success: true,
    message: "Matriks hak akses berhasil disimpan dan langsung diterapkan.",
  };
}
