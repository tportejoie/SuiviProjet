import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

interface AuditInput {
  entityType: string;
  entityId: string;
  action: string;
  diffJson: Prisma.InputJsonValue;
  actorId?: string;
  actorName?: string;
}

export const writeAuditLog = async (input: AuditInput) => {
  return prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      diffJson: input.diffJson,
      actorId: input.actorId,
      actorName: input.actorName,
    },
  });
};
