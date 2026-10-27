import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Akses ditolak: Anda tidak memiliki hak akses untuk tindakan ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = "Sesi Anda tidak valid atau telah kedaluwarsa. Silakan login kembali.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  mustChangePassword: boolean;
  permissions: string[];
}

/**
 * Fetch fresh user info and active permissions directly from database
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const permissions = user.role.permissions.map((rp) => rp.permission.code);

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: user.role.name,
    mustChangePassword: user.mustChangePassword,
    permissions,
  };
}

/**
 * Require valid login session
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Require specific permission with support for ownership check (*_own)
 */
export async function requirePermission(
  permissionCode: string,
  options?: { caseAuthorId?: string }
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  // If user must change password, block other operational actions
  if (user.mustChangePassword && permissionCode !== "user.change_password") {
    throw new ForbiddenError(
      "Anda diwajibkan untuk mengganti kata sandi terlebih dahulu sebelum melanjutkan."
    );
  }

  const allowed = checkPermission(user.permissions, permissionCode, {
    isOwner: options?.caseAuthorId ? user.id === options.caseAuthorId : undefined,
  });

  if (!allowed) {
    throw new ForbiddenError(
      `Akses ditolak: Hak akses '${permissionCode}' diperlukan untuk melakukan tindakan ini.`
    );
  }

  return user;
}

/**
 * Helper to check permission code with ownership fallbacks
 */
export function checkPermission(
  userPermissions: string[],
  permissionCode: string,
  options?: { isOwner?: boolean }
): boolean {
  // If user has exact permission
  if (userPermissions.includes(permissionCode)) {
    if (permissionCode.endsWith("_own")) {
      return options?.isOwner !== false;
    }
    return true;
  }

  // Handle _own fallbacks to _all
  if (permissionCode === "case.view_own") {
    if (userPermissions.includes("case.view_all")) return true;
    return options?.isOwner === true && userPermissions.includes("case.view_own");
  }

  if (permissionCode === "case.edit_own") {
    if (userPermissions.includes("case.edit_all")) return true;
    return options?.isOwner === true && userPermissions.includes("case.edit_own");
  }

  return false;
}
