-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "orderAmount" DOUBLE PRECISION;
