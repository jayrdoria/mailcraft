-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "Brand" AS ENUM ('STAKES', 'X7');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR', 'DE', 'IT', 'ES');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('TEMPLATE_CLONED', 'TEMPLATE_SAVED', 'TEMPLATE_DELETED', 'HTML_COPIED', 'HTML_DOWNLOADED', 'SECTION_DELETED', 'ACCOUNT_CREATED', 'ACCOUNT_DEACTIVATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEPARTMENT',
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canAccessEmails" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "description" TEXT,
    "baseFilePath" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "editableFields" JSONB NOT NULL,
    "lockedFields" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "masterTemplateId" TEXT NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "sectionConfig" JSONB NOT NULL,
    "renderedBasePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_templates" (
    "id" TEXT NOT NULL,
    "savedTemplateId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "savedTemplateId" TEXT,
    "savedTemplateName" TEXT,
    "masterTemplateName" TEXT,
    "sectionName" TEXT,
    "htmlType" TEXT,
    "targetAccountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "master_templates_slug_key" ON "master_templates"("slug");

-- CreateIndex
CREATE INDEX "saved_templates_userId_idx" ON "saved_templates"("userId");

-- CreateIndex
CREATE INDEX "saved_templates_masterTemplateId_idx" ON "saved_templates"("masterTemplateId");

-- CreateIndex
CREATE INDEX "shared_templates_sharedWithId_idx" ON "shared_templates"("sharedWithId");

-- CreateIndex
CREATE INDEX "shared_templates_sharedById_idx" ON "shared_templates"("sharedById");

-- CreateIndex
CREATE UNIQUE INDEX "shared_templates_savedTemplateId_sharedWithId_key" ON "shared_templates"("savedTemplateId", "sharedWithId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- AddForeignKey
ALTER TABLE "saved_templates" ADD CONSTRAINT "saved_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_templates" ADD CONSTRAINT "saved_templates_masterTemplateId_fkey" FOREIGN KEY ("masterTemplateId") REFERENCES "master_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_templates" ADD CONSTRAINT "shared_templates_savedTemplateId_fkey" FOREIGN KEY ("savedTemplateId") REFERENCES "saved_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_templates" ADD CONSTRAINT "shared_templates_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_templates" ADD CONSTRAINT "shared_templates_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
