-- CreateTable
CREATE TABLE "BillOfQuantities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Bill of Quantities',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillOfQuantities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BqElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BqElement_bqId_fkey" FOREIGN KEY ("bqId") REFERENCES "BillOfQuantities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BqBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "elementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BqBill_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "BqElement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BqItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "costCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'measured',
    "quantity" REAL,
    "rate" REAL,
    "amount" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BqItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "BqBill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trade" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InterimCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "certifiedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionPct" REAL NOT NULL DEFAULT 5,
    "grossValuation" REAL NOT NULL DEFAULT 0,
    "retentionHeld" REAL NOT NULL DEFAULT 0,
    "previousCertified" REAL NOT NULL DEFAULT 0,
    "amountCertified" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterimCertificate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpcLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "certificateId" TEXT NOT NULL,
    "bqItemId" TEXT NOT NULL,
    "percentComplete" REAL NOT NULL DEFAULT 0,
    "valueToDate" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "IpcLine_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "InterimCertificate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IpcLine_bqItemId_fkey" FOREIGN KEY ("bqItemId") REFERENCES "BqItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetentionRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "releasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "RetentionRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "retentionPct" REAL NOT NULL DEFAULT 5
);
INSERT INTO "new_Project" ("clientName", "contractValue", "createdAt", "endDate", "id", "name", "startDate", "status", "type", "updatedAt") SELECT "clientName", "contractValue", "createdAt", "endDate", "id", "name", "startDate", "status", "type", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BillOfQuantities_projectId_key" ON "BillOfQuantities"("projectId");

-- CreateIndex
CREATE INDEX "BqElement_bqId_idx" ON "BqElement"("bqId");

-- CreateIndex
CREATE INDEX "BqBill_elementId_idx" ON "BqBill"("elementId");

-- CreateIndex
CREATE INDEX "BqItem_billId_idx" ON "BqItem"("billId");

-- CreateIndex
CREATE INDEX "RateLibraryItem_trade_idx" ON "RateLibraryItem"("trade");

-- CreateIndex
CREATE INDEX "InterimCertificate_projectId_idx" ON "InterimCertificate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "InterimCertificate_projectId_number_key" ON "InterimCertificate"("projectId", "number");

-- CreateIndex
CREATE INDEX "IpcLine_certificateId_idx" ON "IpcLine"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "IpcLine_certificateId_bqItemId_key" ON "IpcLine"("certificateId", "bqItemId");

-- CreateIndex
CREATE INDEX "RetentionRelease_projectId_idx" ON "RetentionRelease"("projectId");
