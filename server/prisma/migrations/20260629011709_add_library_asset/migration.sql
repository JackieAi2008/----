-- CreateTable
CREATE TABLE "LibraryAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storagePath" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'DEPARTMENT',
    "projectId" TEXT,
    "departmentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "tags" TEXT,
    "uploaderNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "LibraryAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LibraryAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LibraryAsset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrgQuotaCounter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "usedBytes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserQuotaCounter" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "usedBytes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserQuotaCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LibraryAsset_ownerId_idx" ON "LibraryAsset"("ownerId");

-- CreateIndex
CREATE INDEX "LibraryAsset_projectId_idx" ON "LibraryAsset"("projectId");

-- CreateIndex
CREATE INDEX "LibraryAsset_departmentId_idx" ON "LibraryAsset"("departmentId");

-- CreateIndex
CREATE INDEX "LibraryAsset_visibility_idx" ON "LibraryAsset"("visibility");

-- CreateIndex
CREATE INDEX "LibraryAsset_createdAt_idx" ON "LibraryAsset"("createdAt");

-- CreateIndex
CREATE INDEX "LibraryAsset_deletedAt_idx" ON "LibraryAsset"("deletedAt");

-- CreateIndex
CREATE INDEX "LibraryAsset_mimeType_idx" ON "LibraryAsset"("mimeType");
