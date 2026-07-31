-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "notes" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProcurementQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "subcontractor" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidAmount" REAL,
    "paidDate" DATETIME,
    CONSTRAINT "ProcurementQuote_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProcurementPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProcurementQuote" ("amount", "id", "isAwarded", "notes", "packageId", "subcontractor", "submittedAt") SELECT "amount", "id", "isAwarded", "notes", "packageId", "subcontractor", "submittedAt" FROM "ProcurementQuote";
DROP TABLE "ProcurementQuote";
ALTER TABLE "new_ProcurementQuote" RENAME TO "ProcurementQuote";
CREATE INDEX "ProcurementQuote_packageId_idx" ON "ProcurementQuote"("packageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_projectId_category_idx" ON "Document"("projectId", "category");
