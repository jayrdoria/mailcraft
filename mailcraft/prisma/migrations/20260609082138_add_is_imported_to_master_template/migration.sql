-- AlterTable
ALTER TABLE "master_templates" ADD COLUMN     "importedBy" TEXT,
ADD COLUMN     "isImported" BOOLEAN NOT NULL DEFAULT false;
