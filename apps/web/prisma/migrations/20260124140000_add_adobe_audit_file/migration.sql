ALTER TABLE "AdobeAgreement" ADD COLUMN "auditFileId" TEXT;

ALTER TABLE "AdobeAgreement" ADD CONSTRAINT "AdobeAgreement_auditFileId_fkey" FOREIGN KEY ("auditFileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
