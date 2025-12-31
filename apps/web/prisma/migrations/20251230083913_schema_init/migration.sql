-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalForm" TEXT,
    "headquarters" TEXT,
    "siren" TEXT,
    "siret" TEXT,
    "tvaNumber" TEXT,
    "capital" TEXT,
    "rcs" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
