import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac/guard";
import { AccessDenied } from "@/components/access-denied";
import { AuditClient } from "./audit-client";

interface AuditPageProps {
  searchParams: Promise<{
    q?: string;
    username?: string;
    action?: string;
    date?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!user.permissions.includes("audit.view")) {
    return (
      <AccessDenied
        permission="audit.view"
        title="Akses Audit Trail Ditolak"
        message="Akun Anda tidak memiliki wewenang untuk memeriksa rekaman log audit keamanan sistem."
      />
    );
  }

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const username = params.username?.trim() || "";
  const action = params.action?.trim() || "";
  const dateStr = params.date?.trim() || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const pageSize = Math.max(5, Math.min(100, parseInt(params.limit || "8", 10)));

  const where: any = {};

  if (username) {
    where.username = username;
  }

  if (action) {
    where.action = action;
  }

  if (q) {
    where.OR = [
      { summary: { contains: q } },
      { entity: { contains: q } },
      { entityId: { contains: q } },
    ];
  }

  if (dateStr) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    where.createdAt = {
      gte: start,
      lte: end,
    };
  }

  const [totalItems, logs, users, distinctActions]: [
    number,
    any[],
    { username: string; fullName: string }[],
    { action: string }[]
  ] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.findMany({
      select: { username: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="space-y-4">
      <AuditClient
        logs={logs as any}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={page}
        pageSize={pageSize}
        usersList={users}
        actionsList={distinctActions.map((a) => a.action).filter(Boolean)}
        currentFilter={{
          q,
          username,
          action,
          date: dateStr,
        }}
      />
    </div>
  );
}
