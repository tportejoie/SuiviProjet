-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('AT', 'FORFAIT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PREVU', 'EN_COURS', 'CLOS', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('MONTH_END', 'BORDEREAU_GENERATED', 'BORDEREAU_SIGNED', 'RECTIFICATIF', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('NON_REMIS', 'REMIS', 'VALIDE');

-- CreateEnum
CREATE TYPE "TimeEntryType" AS ENUM ('BO', 'SITE');

-- CreateEnum
CREATE TYPE "BordereauType" AS ENUM ('BA', 'BL', 'RECTIFICATIF');

-- CreateEnum
CREATE TYPE "BordereauStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'SIGNED');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "tvaIntra" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "quoteDate" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "projectManager" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "atDaysSoldBO" DOUBLE PRECISION,
    "atDaysSoldSite" DOUBLE PRECISION,
    "atDailyRateBO" DOUBLE PRECISION,
    "atDailyRateSite" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "type" "TimeEntryType" NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "hourSlot" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'NON_REMIS',
    "submissionDate" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSituationSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "SnapshotType" NOT NULL,
    "year" INTEGER,
    "month" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedBy" TEXT NOT NULL,
    "sourceRef" TEXT,
    "dataJson" JSONB NOT NULL,
    "supersedesSnapshotId" TEXT,

    CONSTRAINT "ProjectSituationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLock" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bordereau" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "BordereauType" NOT NULL,
    "status" "BordereauStatus" NOT NULL DEFAULT 'DRAFT',
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "snapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Bordereau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BordereauVersion" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "snapshotId" TEXT,

    CONSTRAINT "BordereauVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdobeAgreement" (
    "id" TEXT NOT NULL,
    "bordereauId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdobeAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diffJson" JSONB NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_year_month_idx" ON "TimeEntry"("projectId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_projectId_year_month_day_type_hourSlot_key" ON "TimeEntry"("projectId", "year", "month", "day", "type", "hourSlot");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodLock_projectId_year_month_key" ON "PeriodLock"("projectId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AdobeAgreement_bordereauId_key" ON "AdobeAgreement"("bordereauId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSituationSnapshot" ADD CONSTRAINT "ProjectSituationSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSituationSnapshot" ADD CONSTRAINT "ProjectSituationSnapshot_supersedesSnapshotId_fkey" FOREIGN KEY ("supersedesSnapshotId") REFERENCES "ProjectSituationSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordereau" ADD CONSTRAINT "Bordereau_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ProjectSituationSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BordereauVersion" ADD CONSTRAINT "BordereauVersion_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BordereauVersion" ADD CONSTRAINT "BordereauVersion_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ProjectSituationSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BordereauVersion" ADD CONSTRAINT "BordereauVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdobeAgreement" ADD CONSTRAINT "AdobeAgreement_bordereauId_fkey" FOREIGN KEY ("bordereauId") REFERENCES "Bordereau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
