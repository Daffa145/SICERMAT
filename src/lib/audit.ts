import { prisma } from "@/lib/prisma";

export interface LogAuditParams {
  userId?: string;
  username: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export async function logAudit({
  userId,
  username,
  action,
  entity,
  entityId,
  summary,
  details,
  ipAddress,
}: LogAuditParams): Promise<void> {
  try {
    const detailsString =
      typeof details === "object" ? JSON.stringify(details) : details;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        username,
        action,
        entity,
        entityId: entityId || null,
        summary,
        details: detailsString || null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    // Audit logging should never break the main transaction, but log in dev
    console.error("Gagal mencatat audit log:", error);
  }
}
