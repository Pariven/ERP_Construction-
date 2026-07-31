-- CreateTable
CREATE TABLE "ExtensionOfTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "daysClaimed" INTEGER NOT NULL,
    "daysApproved" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'claimed',
    "linkedVoId" TEXT,
    "claimedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtensionOfTime_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExtensionOfTime_linkedVoId_fkey" FOREIGN KEY ("linkedVoId") REFERENCES "VariationOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fluctuationAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "agreedDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinalAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costCode" TEXT,
    "ownEstimate" REAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcurementPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "subcontractor" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcurementQuote_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProcurementPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "contractValue" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "retentionPct" REAL NOT NULL DEFAULT 5,
    "ladRatePerDay" REAL NOT NULL DEFAULT 0,
    "ladGraceDays" INTEGER NOT NULL DEFAULT 0,
    "ladCapPct" REAL,
    "hasFluctuationClause" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Project" ("clientName", "contractValue", "createdAt", "endDate", "id", "imageUrl", "name", "retentionPct", "startDate", "status", "type", "updatedAt") SELECT "clientName", "contractValue", "createdAt", "endDate", "id", "imageUrl", "name", "retentionPct", "startDate", "status", "type", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ExtensionOfTime_projectId_idx" ON "ExtensionOfTime"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalAccount_projectId_key" ON "FinalAccount"("projectId");

-- CreateIndex
CREATE INDEX "ProcurementPackage_projectId_idx" ON "ProcurementPackage"("projectId");

-- CreateIndex
CREATE INDEX "ProcurementQuote_packageId_idx" ON "ProcurementQuote"("packageId");
