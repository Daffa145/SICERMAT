"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/guard";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { ActionResult } from "./auth";

const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Nama pengguna minimal 3 karakter")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Karakter tidak valid untuk nama pengguna"),
  fullName: z.string().min(2, "Nama lengkap wajib diisi"),
  nip: z.string().optional(),
  password: z.string().min(10, "Kata sandi minimal 10 karakter"),
  roleId: z.string().min(1, "Peran (role) wajib dipilih"),
  mustChangePassword: z.boolean().default(true),
});

const UpdateUserSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap wajib diisi"),
  nip: z.string().optional(),
  roleId: z.string().min(1, "Peran (role) wajib dipilih"),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
});

/**
 * Validasi untuk mencegah lockout Administrator terakhir
 */
async function ensureNotLastAdmin(targetUserId: string): Promise<boolean> {
  const adminRoleWithManage = await prisma.role.findFirst({
    where: {
      permissions: {
        some: {
          permission: {
            code: "role.manage",
          },
        },
      },
    },
    include: {
      users: {
        where: {
          isActive: true,
        },
      },
    },
  });

  if (!adminRoleWithManage) return true;

  const activeAdminUsers = adminRoleWithManage.users;
  const isTargetTheOnlyAdmin =
    activeAdminUsers.length === 1 && activeAdminUsers[0].id === targetUserId;

  return !isTargetTheOnlyAdmin;
}

export async function createUserAction(formData: {
  username: string;
  fullName: string;
  nip?: string;
  password: string;
  roleId: string;
  mustChangePassword?: boolean;
}): Promise<ActionResult> {
  const actor = await requirePermission("user.create");

  const parsed = CreateUserSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data pengguna baru tidak valid.",
    };
  }

  const { username, fullName, nip, password, roleId, mustChangePassword } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return {
      success: false,
      message: `Nama pengguna '${username}' sudah digunakan.`,
    };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return { success: false, message: "Peran yang dipilih tidak ditemukan." };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      username,
      fullName,
      nip: nip || null,
      passwordHash,
      roleId,
      mustChangePassword: mustChangePassword ?? true,
      isActive: true,
    },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_CREATE",
    entity: "User",
    entityId: newUser.id,
    summary: `Menambahkan pengguna baru: ${username} (${fullName}) dengan peran ${role.name}`,
    details: { username, fullName, role: role.name },
  });

  return { success: true, message: "Pengguna berhasil ditambahkan." };
}

export async function updateUserAction(
  userId: string,
  formData: {
    fullName: string;
    nip?: string;
    roleId: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }
): Promise<ActionResult> {
  const actor = await requirePermission("user.edit");

  const parsed = UpdateUserSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data pembaruan pengguna tidak valid.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  // Jika status diubah menjadi tidak aktif atau peran diubah, pastikan bukan admin terakhir
  if (!parsed.data.isActive || parsed.data.roleId !== user.roleId) {
    const canModify = await ensureNotLastAdmin(userId);
    if (!canModify) {
      return {
        success: false,
        message:
          "Tindakan ditolak: Tidak dapat menonaktifkan atau mengubah peran Administrator terakhir untuk mencegah lockout sistem.",
      };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: parsed.data.fullName,
      nip: parsed.data.nip || null,
      roleId: parsed.data.roleId,
      isActive: parsed.data.isActive,
      mustChangePassword: parsed.data.mustChangePassword,
    },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_UPDATE",
    entity: "User",
    entityId: userId,
    summary: `Memperbarui data pengguna: ${user.username}`,
    details: parsed.data,
  });

  return { success: true, message: "Data pengguna berhasil diperbarui." };
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  const actor = await requirePermission("user.edit");

  if (!newPassword || newPassword.length < 10) {
    return {
      success: false,
      message: "Kata sandi baru minimal 10 karakter.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_RESET_PASSWORD",
    entity: "User",
    entityId: userId,
    summary: `Mereset kata sandi pengguna: ${user.username} (wajib ganti saat login berikutnya)`,
  });

  return {
    success: true,
    message: "Kata sandi pengguna berhasil direset.",
  };
}

export async function deactivateUserAction(
  userId: string
): Promise<ActionResult> {
  const actor = await requirePermission("user.deactivate");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  const canModify = await ensureNotLastAdmin(userId);
  if (!canModify) {
    return {
      success: false,
      message:
        "Tindakan ditolak: Tidak dapat menonaktifkan Administrator terakhir sistem.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_DEACTIVATE",
    entity: "User",
    entityId: userId,
    summary: `Menonaktifkan pengguna: ${user.username}`,
  });

  return { success: true, message: "Pengguna berhasil dinonaktifkan." };
}

export async function activateUserAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermission("user.edit");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_ACTIVATE",
    entity: "User",
    entityId: userId,
    summary: `Mengaktifkan kembali pengguna: ${user.username}`,
  });

  return { success: true, message: `Akun pengguna '${user.username}' berhasil diaktifkan kembali.` };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermission("user.edit");

  if (userId === actor.id) {
    return {
      success: false,
      message: "Tindakan ditolak: Anda tidak dapat menghapus akun Anda sendiri.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  const canModify = await ensureNotLastAdmin(userId);
  if (!canModify) {
    return {
      success: false,
      message:
        "Tindakan ditolak: Tidak dapat menghapus Administrator terakhir sistem.",
    };
  }

  // Cek apakah user memiliki riwayat keterkaitan data kasus
  const [createdCasesCount, versionsCount, commentsCount] = await Promise.all([
    prisma.case.count({ where: { authorId: userId } }),
    prisma.caseVersion.count({ where: { createdById: userId } }),
    prisma.caseComment.count({ where: { userId } }),
  ]);

  if (createdCasesCount > 0 || versionsCount > 0 || commentsCount > 0) {
    return {
      success: false,
      message: `Pengguna '${user.username}' telah memiliki riwayat data kasus/evaluasi terkait. Silakan gunakan opsi 'Nonaktifkan Akun' untuk mencabut hak akses tanpa merusak riwayat audit instansi.`,
    };
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  await logAudit({
    userId: actor.id,
    username: actor.username,
    action: "USER_DELETE",
    entity: "User",
    entityId: userId,
    summary: `Menghapus pengguna: ${user.username} (${user.fullName})`,
  });

  return {
    success: true,
    message: `Pengguna '${user.username}' berhasil dihapus secara permanen.`,
  };
}
