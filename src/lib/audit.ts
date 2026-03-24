import { prisma } from "./prisma";

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
      beforeValue: params.before ?? undefined,
      afterValue: params.after ?? undefined,
      ipAddress: params.ipAddress,
    },
  });
}
