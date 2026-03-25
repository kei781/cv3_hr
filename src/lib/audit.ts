import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      beforeValue: (params.before ?? undefined) as Prisma.InputJsonValue | undefined,
      afterValue: (params.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
    },
  });
}
