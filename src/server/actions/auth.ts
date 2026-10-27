"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

const LoginSchema = z.object({
  username: z.string().min(1, "Nama pengguna wajib diisi"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(10, "Kata sandi baru minimal 10 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export interface ActionResult<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ mustChangePassword: boolean }>> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data login tidak valid",
    };
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user) {
    return {
      success: false,
      message: "Nama pengguna atau kata sandi tidak valid",
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      message: "Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.",
    };
  }

  // Cek penguncian akun (5 menit setelah 5 kegagalan)
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingSeconds = Math.ceil(
      (user.lockedUntil.getTime() - now.getTime()) / 1000
    );
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return {
      success: false,
      message: `Akun Anda terkunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${remainingMinutes} menit.`,
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;
    let lockMessage = "";

    if (attempts >= 5) {
      lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      lockMessage = " Akun dikunci sementara selama 5 menit.";
      await logAudit({
        userId: user.id,
        username: user.username,
        action: "AUTH_LOCKOUT",
        entity: "User",
        entityId: user.id,
        summary: `Akun dikunci 5 menit akibat 5 kali percobaan login gagal berturut-turut.`,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts >= 5 ? 0 : attempts,
        lockedUntil,
      },
    });

    return {
      success: false,
      message: `Nama pengguna atau kata sandi tidak valid.${lockMessage}`,
    };
  }

  // Login berhasil: reset percobaan gagal
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: user.role.name,
    mustChangePassword: user.mustChangePassword,
  });

  await setSessionCookie(token);

  await logAudit({
    userId: user.id,
    username: user.username,
    action: "AUTH_LOGIN",
    entity: "User",
    entityId: user.id,
    summary: `Pengguna ${user.username} (${user.fullName}) berhasil masuk.`,
  });

  return {
    success: true,
    data: {
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      message: "Sesi tidak valid. Silakan login kembali.",
    };
  }

  const parsed = ChangePasswordSchema.safeParse({
    oldPassword: formData.get("oldPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Data perubahan kata sandi tidak valid",
    };
  }

  const { oldPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  });

  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }

  const isOldMatch = await verifyPassword(oldPassword, user.passwordHash);
  if (!isOldMatch) {
    return {
      success: false,
      message: "Kata sandi saat ini tidak cocok.",
    };
  }

  if (oldPassword === newPassword) {
    return {
      success: false,
      message: "Kata sandi baru tidak boleh sama dengan kata sandi lama.",
    };
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  // Perbarui cookie sesi dengan status mustChangePassword: false
  const updatedToken = await createSessionToken({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: user.role.name,
    mustChangePassword: false,
  });
  await setSessionCookie(updatedToken);

  await logAudit({
    userId: user.id,
    username: user.username,
    action: "AUTH_PASSWORD_CHANGE",
    entity: "User",
    entityId: user.id,
    summary: `Pengguna ${user.username} memperbarui kata sandi.`,
  });

  return {
    success: true,
    message: "Kata sandi berhasil diperbarui.",
  };
}

export async function logoutAction(): Promise<ActionResult> {
  const session = await getSession();
  if (session) {
    await logAudit({
      userId: session.userId,
      username: session.username,
      action: "AUTH_LOGOUT",
      entity: "User",
      entityId: session.userId,
      summary: `Pengguna ${session.username} keluar dari sistem.`,
    });
  }

  await clearSessionCookie();
  return { success: true };
}
