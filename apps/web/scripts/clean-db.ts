import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.bordereauVersion.deleteMany(),
    prisma.adobeAgreement.deleteMany(),
    prisma.bordereauComment.deleteMany(),
    prisma.bordereau.deleteMany(),
    prisma.projectSituationSnapshot.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.deliverable.deleteMany(),
    prisma.periodLock.deleteMany(),
    prisma.project.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.client.deleteMany(),
    prisma.fileObject.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.companySettings.deleteMany(),
  ]);
};

run()
  .catch((error) => {
    console.error("Clean DB failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
