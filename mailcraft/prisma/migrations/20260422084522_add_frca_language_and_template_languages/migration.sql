-- AlterEnum
ALTER TYPE "Language" ADD VALUE 'FRCA';

-- AlterTable
ALTER TABLE "master_templates" ADD COLUMN     "languages" JSONB NOT NULL DEFAULT '[]';
