-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliverableOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COMMENT',
    "mentions" TEXT,
    "replyToId" TEXT,
    "images" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("content", "createdAt", "deletedAt", "id", "images", "mentions", "replyToId", "taskId", "userId") SELECT "content", "createdAt", "deletedAt", "id", "images", "mentions", "replyToId", "taskId", "userId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");
CREATE INDEX "Comment_type_idx" ON "Comment"("type");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "category" TEXT,
    "ownerId" TEXT NOT NULL,
    "departmentId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("cover", "createdAt", "deletedAt", "departmentId", "description", "id", "name", "ownerId", "updatedAt", "visibility") SELECT "cover", "createdAt", "deletedAt", "departmentId", "description", "id", "name", "ownerId", "updatedAt", "visibility" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_departmentId_idx" ON "Project"("departmentId");
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");
CREATE INDEX "Project_isArchived_idx" ON "Project"("isArchived");
CREATE INDEX "Project_category_idx" ON "Project"("category");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "dueDate" DATETIME NOT NULL,
    "categoryId" TEXT,
    "assigneeId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'IMPORTANT_URGENT',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "deliverable" TEXT,
    "tags" TEXT,
    "reminder" TEXT,
    "repeat" TEXT,
    "creatorId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "completionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("archivedAt", "assigneeId", "categoryId", "createdAt", "creatorId", "deletedAt", "deliverable", "description", "dueDate", "id", "isArchived", "priority", "projectId", "reminder", "repeat", "startDate", "status", "tags", "title", "updatedAt", "visibility") SELECT "archivedAt", "assigneeId", "categoryId", "createdAt", "creatorId", "deletedAt", "deliverable", "description", "dueDate", "id", "isArchived", "priority", "projectId", "reminder", "repeat", "startDate", "status", "tags", "title", "updatedAt", "visibility" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_isArchived_idx" ON "Task"("isArchived");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX "Task_visibility_idx" ON "Task"("visibility");
CREATE TABLE "new_TaskTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'IMPORTANT_URGENT',
    "categoryId" TEXT,
    "defaultAssignee" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TaskTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskTemplate" ("categoryId", "createdAt", "creatorId", "defaultAssignee", "description", "id", "priority", "title", "updatedAt") SELECT "categoryId", "createdAt", "creatorId", "defaultAssignee", "description", "id", "priority", "title", "updatedAt" FROM "TaskTemplate";
DROP TABLE "TaskTemplate";
ALTER TABLE "new_TaskTemplate" RENAME TO "TaskTemplate";
CREATE INDEX "TaskTemplate_creatorId_idx" ON "TaskTemplate"("creatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Evaluation_evaluatorId_idx" ON "Evaluation"("evaluatorId");

-- CreateIndex
CREATE INDEX "Evaluation_targetUserId_idx" ON "Evaluation"("targetUserId");

-- CreateIndex
CREATE INDEX "Evaluation_projectId_idx" ON "Evaluation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_taskId_targetUserId_evaluatorId_key" ON "Evaluation"("taskId", "targetUserId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableOption_name_key" ON "DeliverableOption"("name");
