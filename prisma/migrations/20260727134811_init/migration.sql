-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "contractValue" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "costCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "budgeted" REAL NOT NULL,
    "committed" REAL NOT NULL DEFAULT 0,
    "actual" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costCode" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariationOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costImpact" REAL NOT NULL,
    "scheduleImpactDays" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "docsUrl" TEXT,
    "budgetLineId" TEXT,
    "scheduleTaskId" TEXT,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VariationOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VariationOrder_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VariationOrder_scheduleTaskId_fkey" FOREIGN KEY ("scheduleTaskId") REFERENCES "ScheduleTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChecklistItemTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistItemTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "location" TEXT,
    "inspectedBy" TEXT,
    "inspectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    CONSTRAINT "Inspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduleTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inspection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "passed" BOOLEAN,
    "notes" TEXT,
    "photoUrl" TEXT,
    CONSTRAINT "InspectionResult_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "correctiveAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "raisedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    CONSTRAINT "Defect_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "InspectionResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BudgetLine_projectId_idx" ON "BudgetLine"("projectId");

-- CreateIndex
CREATE INDEX "BudgetLine_projectId_costCode_idx" ON "BudgetLine"("projectId", "costCode");

-- CreateIndex
CREATE INDEX "ScheduleTask_projectId_idx" ON "ScheduleTask"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleTask_projectId_costCode_idx" ON "ScheduleTask"("projectId", "costCode");

-- CreateIndex
CREATE INDEX "VariationOrder_projectId_idx" ON "VariationOrder"("projectId");

-- CreateIndex
CREATE INDEX "VariationOrder_projectId_status_idx" ON "VariationOrder"("projectId", "status");

-- CreateIndex
CREATE INDEX "ChecklistItemTemplate_templateId_idx" ON "ChecklistItemTemplate"("templateId");

-- CreateIndex
CREATE INDEX "Inspection_projectId_idx" ON "Inspection"("projectId");

-- CreateIndex
CREATE INDEX "Inspection_taskId_idx" ON "Inspection"("taskId");

-- CreateIndex
CREATE INDEX "InspectionResult_inspectionId_idx" ON "InspectionResult"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Defect_resultId_key" ON "Defect"("resultId");

-- CreateIndex
CREATE INDEX "Defect_status_idx" ON "Defect"("status");
