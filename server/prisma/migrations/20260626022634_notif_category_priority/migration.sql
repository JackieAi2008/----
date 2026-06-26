/*
  Warnings:

  - Renamed column `type` on `Notification` to `category`. Values are mapped
    from old enum to new category via CASE (see SELECT below).
  - Added `priority` column defaulting to NORMAL.

  r0 §4 notif_category_priority — old type → new category mapping:
    PROJECT_INVITE              -> INVITE
    PROJECT_JOIN_REQUEST        -> INVITE
    TASK_ASSIGNED               -> TASK_REMINDER
    TASK_DUE                    -> TASK_REMINDER
    TASK_STATUS_CHANGED         -> TASK_REMINDER
    TASK_COMMENT                -> MENTION
    TASK_COLLABORATOR           -> TASK_REMINDER
    TASK_RECURRING              -> TASK_REMINDER
    EVALUATION_SUBMITTED        -> EVALUATION
    MENTION                     -> MENTION
    PROJECT_JOIN_APPROVED       -> SYSTEM
    PROJECT_JOIN_REJECTED       -> SYSTEM
    PROJECT_UPDATED             -> SYSTEM
    anything else               -> SYSTEM
*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" (
    "id", "userId", "category", "title", "content", "relatedType", "relatedId", "isRead", "priority", "createdAt"
)
SELECT
    "id",
    "userId",
    CASE "type"
        WHEN 'PROJECT_INVITE' THEN 'INVITE'
        WHEN 'PROJECT_JOIN_REQUEST' THEN 'INVITE'
        WHEN 'TASK_ASSIGNED' THEN 'TASK_REMINDER'
        WHEN 'TASK_DUE' THEN 'TASK_REMINDER'
        WHEN 'TASK_STATUS_CHANGED' THEN 'TASK_REMINDER'
        WHEN 'TASK_COLLABORATOR' THEN 'TASK_REMINDER'
        WHEN 'TASK_RECURRING' THEN 'TASK_REMINDER'
        WHEN 'EVALUATION_SUBMITTED' THEN 'EVALUATION'
        WHEN 'MENTION' THEN 'MENTION'
        WHEN 'TASK_COMMENT' THEN 'MENTION'
        WHEN 'PROJECT_JOIN_APPROVED' THEN 'SYSTEM'
        WHEN 'PROJECT_JOIN_REJECTED' THEN 'SYSTEM'
        WHEN 'PROJECT_UPDATED' THEN 'SYSTEM'
        ELSE 'SYSTEM'
    END AS "category",
    "title",
    "content",
    "relatedType",
    "relatedId",
    "isRead",
    'NORMAL' AS "priority",
    "createdAt"
FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_userId_category_idx" ON "Notification"("userId", "category");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
