import { PrismaClient } from "@prisma/client";
import { updateVariationOrderStatus } from "../lib/variations";
import { computeBqItemAmount, recomputeCertificate } from "../lib/bq";
import { updateEotStatus } from "../lib/eot";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Each reseed creates fresh project IDs, so old document folders would
  // otherwise pile up as orphaned files on disk.
  await fs.rm(path.join(process.cwd(), "public", "uploads", "documents"), { recursive: true, force: true });

  await prisma.document.deleteMany();
  await prisma.procurementQuote.deleteMany();
  await prisma.procurementPackage.deleteMany();
  await prisma.finalAccount.deleteMany();
  await prisma.extensionOfTime.deleteMany();
  await prisma.retentionRelease.deleteMany();
  await prisma.ipcLine.deleteMany();
  await prisma.interimCertificate.deleteMany();
  await prisma.bqItem.deleteMany();
  await prisma.bqBill.deleteMany();
  await prisma.bqElement.deleteMany();
  await prisma.billOfQuantities.deleteMany();
  await prisma.rateLibraryItem.deleteMany();
  await prisma.defect.deleteMany();
  await prisma.inspectionResult.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.checklistItemTemplate.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.variationOrder.deleteMany();
  await prisma.scheduleTask.deleteMany();
  await prisma.budgetLine.deleteMany();
  await prisma.project.deleteMany();

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 86_400_000);

  // ---------------------------------------------------------------------
  // Project 1: Riverside Residences — mid-project, has active VOs & defects
  // ---------------------------------------------------------------------
  const riverside = await prisma.project.create({
    data: {
      name: "Riverside Residences",
      type: "RESIDENTIAL",
      clientName: "Maple Grove Developments",
      contractValue: 4_250_000,
      startDate: daysAgo(120),
      endDate: daysFromNow(150),
      status: "active",
    },
  });

  const foundations = await prisma.budgetLine.create({
    data: {
      projectId: riverside.id,
      costCode: "03-300",
      category: "Concrete — Foundations",
      budgeted: 380_000,
      committed: 380_000,
      actual: 365_000,
    },
  });
  const framing = await prisma.budgetLine.create({
    data: {
      projectId: riverside.id,
      costCode: "06-100",
      category: "Rough Carpentry / Framing",
      budgeted: 520_000,
      committed: 520_000,
      actual: 498_000,
    },
  });
  const electrical = await prisma.budgetLine.create({
    data: {
      projectId: riverside.id,
      costCode: "26-000",
      category: "Electrical",
      budgeted: 310_000,
      committed: 310_000,
      actual: 140_000,
    },
  });
  const plumbing = await prisma.budgetLine.create({
    data: {
      projectId: riverside.id,
      costCode: "22-000",
      category: "Plumbing",
      budgeted: 275_000,
      committed: 275_000,
      actual: 120_000,
    },
  });
  const finishes = await prisma.budgetLine.create({
    data: {
      projectId: riverside.id,
      costCode: "09-900",
      category: "Finishes & Paint",
      budgeted: 240_000,
      committed: 240_000,
      actual: 15_000,
    },
  });

  const foundationTask = await prisma.scheduleTask.create({
    data: {
      projectId: riverside.id,
      name: "Pour foundations — Blocks A–C",
      costCode: "03-300",
      startDate: daysAgo(120),
      endDate: daysAgo(95),
      percentComplete: 100,
      status: "complete",
    },
  });
  const framingTask = await prisma.scheduleTask.create({
    data: {
      projectId: riverside.id,
      name: "Frame superstructure — Blocks A–C",
      costCode: "06-100",
      startDate: daysAgo(90),
      endDate: daysAgo(10),
      percentComplete: 92,
      status: "in_progress",
    },
  });
  const electricalTask = await prisma.scheduleTask.create({
    data: {
      projectId: riverside.id,
      name: "First-fix electrical",
      costCode: "26-000",
      startDate: daysAgo(20),
      endDate: daysFromNow(25),
      percentComplete: 45,
      status: "in_progress",
    },
  });
  const plumbingTask = await prisma.scheduleTask.create({
    data: {
      projectId: riverside.id,
      name: "First-fix plumbing",
      costCode: "22-000",
      startDate: daysAgo(15),
      endDate: daysFromNow(30),
      percentComplete: 38,
      status: "in_progress",
    },
  });
  await prisma.scheduleTask.create({
    data: {
      projectId: riverside.id,
      name: "Interior finishes — Block A",
      costCode: "09-900",
      startDate: daysFromNow(35),
      endDate: daysFromNow(90),
      percentComplete: 0,
      status: "not_started",
    },
  });

  // A VO already approved — demonstrates the cascade already having fired
  // (committed on `electrical` and dates on `electricalTask` reflect it).
  const approvedVo = await prisma.variationOrder.create({
    data: {
      projectId: riverside.id,
      code: "VO-011",
      title: "Upgrade panel capacity — Block B",
      description:
        "Client requested higher-spec distribution boards after utility survey revealed insufficient headroom.",
      costImpact: 18_500,
      scheduleImpactDays: 4,
      status: "draft",
      budgetLineId: electrical.id,
      scheduleTaskId: electricalTask.id,
    },
  });
  await updateVariationOrderStatus(approvedVo.id, "submitted");
  await updateVariationOrderStatus(approvedVo.id, "approved");

  // A VO awaiting approval — sits idle until someone acts on it.
  const waterproofingVo = await prisma.variationOrder.create({
    data: {
      projectId: riverside.id,
      code: "VO-014",
      title: "Additional waterproofing — basement retaining wall",
      description: "Site conditions required an extra membrane layer not in original scope.",
      costImpact: 9_200,
      scheduleImpactDays: 2,
      status: "submitted",
      submittedAt: daysAgo(3),
      budgetLineId: foundations.id,
      scheduleTaskId: foundationTask.id,
    },
  });

  // A disputed VO.
  await prisma.variationOrder.create({
    data: {
      projectId: riverside.id,
      code: "VO-015",
      title: "Plumbing reroute around structural beam",
      description: "Subcontractor claims beam clash not shown on issued drawings.",
      costImpact: 6_400,
      scheduleImpactDays: 3,
      status: "disputed",
      submittedAt: daysAgo(9),
      budgetLineId: plumbing.id,
      scheduleTaskId: plumbingTask.id,
    },
  });

  // Draft VO, not yet submitted.
  await prisma.variationOrder.create({
    data: {
      projectId: riverside.id,
      code: "VO-016",
      title: "Paint spec upgrade — lobby feature wall",
      costImpact: 2_100,
      scheduleImpactDays: 0,
      status: "draft",
      budgetLineId: finishes.id,
    },
  });

  // ---------------------------------------------------------------------
  // QA/QC — a checklist template, one completed inspection with a defect,
  // one clean inspection.
  // ---------------------------------------------------------------------
  const framingChecklist = await prisma.checklistTemplate.create({
    data: {
      name: "Framing Inspection — Standard",
      category: "Structural",
      items: {
        create: [
          { label: "Stud spacing per drawings", sortOrder: 1 },
          { label: "Fire blocking installed", sortOrder: 2 },
          { label: "Sheathing nailing pattern correct", sortOrder: 3 },
          { label: "No visible moisture damage", sortOrder: 4 },
        ],
      },
    },
  });

  const inspectionWithDefect = await prisma.inspection.create({
    data: {
      projectId: riverside.id,
      taskId: framingTask.id,
      templateId: framingChecklist.id,
      location: "Block B — Level 2",
      inspectedBy: "R. Alvarez",
      inspectedAt: daysAgo(4),
      status: "complete",
      results: {
        create: [
          { itemLabel: "Stud spacing per drawings", passed: true },
          { itemLabel: "Fire blocking installed", passed: true },
          {
            itemLabel: "Sheathing nailing pattern correct",
            passed: false,
            notes: "Nail spacing exceeds 6\" o.c. on east wall panel 4.",
          },
          { itemLabel: "No visible moisture damage", passed: true },
        ],
      },
    },
    include: { results: true },
  });

  const failedResult = inspectionWithDefect.results.find((r) => r.passed === false)!;
  await prisma.defect.create({
    data: {
      resultId: failedResult.id,
      description: "Sheathing nail spacing exceeds spec on east wall, panel 4.",
      severity: "medium",
      correctiveAction: "Add supplemental nailing to bring spacing to 6\" o.c.",
      status: "open",
      raisedAt: daysAgo(4),
    },
  });

  await prisma.inspection.create({
    data: {
      projectId: riverside.id,
      taskId: foundationTask.id,
      templateId: framingChecklist.id,
      location: "Block A — Footings",
      inspectedBy: "R. Alvarez",
      inspectedAt: daysAgo(90),
      status: "complete",
      results: {
        create: [
          { itemLabel: "Stud spacing per drawings", passed: true },
          { itemLabel: "Fire blocking installed", passed: true },
          { itemLabel: "Sheathing nailing pattern correct", passed: true },
          { itemLabel: "No visible moisture damage", passed: true },
        ],
      },
    },
  });

  // ---------------------------------------------------------------------
  // Rate library — global, reused across every project.
  // ---------------------------------------------------------------------
  await prisma.rateLibraryItem.createMany({
    data: [
      { trade: "Concrete", description: "Reinforced concrete, foundations, C30/37", unit: "m3", rate: 285 },
      { trade: "Concrete", description: "Formwork to strip foundations", unit: "m2", rate: 42 },
      { trade: "Carpentry", description: "Timber stud wall framing, 2x6 @ 16\" o.c.", unit: "m2", rate: 38 },
      { trade: "Electrical", description: "Distribution board, 42-way, 400A", unit: "nr", rate: 2_450 },
      { trade: "Electrical", description: "First-fix conduit and wiring, standard circuit", unit: "point", rate: 165 },
      { trade: "Plumbing", description: "Copper pipework, first fix, 15-22mm", unit: "m", rate: 24 },
      { trade: "Finishes", description: "Emulsion paint, 2 coats, walls and ceilings", unit: "m2", rate: 9.5 },
    ],
  });

  // ---------------------------------------------------------------------
  // Bill of Quantities — Riverside Residences. Elements → Bills → Items,
  // priced qty x rate, with one provisional sum. This is what the IPC
  // lines below claim against.
  // ---------------------------------------------------------------------
  const riversideBq = await prisma.billOfQuantities.create({
    data: { projectId: riverside.id, name: "Riverside Residences — Priced BQ" },
  });

  const substructure = await prisma.bqElement.create({
    data: { bqId: riversideBq.id, name: "Substructure", sortOrder: 1 },
  });
  const superstructure = await prisma.bqElement.create({
    data: { bqId: riversideBq.id, name: "Superstructure", sortOrder: 2 },
  });
  const services = await prisma.bqElement.create({
    data: { bqId: riversideBq.id, name: "Services", sortOrder: 3 },
  });
  const finishesElement = await prisma.bqElement.create({
    data: { bqId: riversideBq.id, name: "Finishes", sortOrder: 4 },
  });

  const foundationsBill = await prisma.bqBill.create({
    data: { elementId: substructure.id, name: "Concrete Work", sortOrder: 1 },
  });
  const framingBill = await prisma.bqBill.create({
    data: { elementId: superstructure.id, name: "Carpentry", sortOrder: 1 },
  });
  const electricalBill = await prisma.bqBill.create({
    data: { elementId: services.id, name: "Electrical Installation", sortOrder: 1 },
  });
  const plumbingBill = await prisma.bqBill.create({
    data: { elementId: services.id, name: "Plumbing Installation", sortOrder: 2 },
  });
  const decoratingBill = await prisma.bqBill.create({
    data: { elementId: finishesElement.id, name: "Decorating", sortOrder: 1 },
  });

  async function addBqItem(input: {
    billId: string;
    costCode: string;
    description: string;
    unit: string;
    kind?: "measured" | "provisional_sum" | "pc_sum";
    quantity?: number;
    rate?: number;
    amount?: number;
    sortOrder: number;
  }) {
    const kind = input.kind ?? "measured";
    const amount = computeBqItemAmount(kind, input.quantity ?? null, input.rate ?? null, input.amount ?? 0);
    return prisma.bqItem.create({
      data: {
        billId: input.billId,
        costCode: input.costCode,
        description: input.description,
        unit: input.unit,
        kind,
        quantity: input.quantity,
        rate: input.rate,
        amount,
        sortOrder: input.sortOrder,
      },
    });
  }

  const foundationBqItem = await addBqItem({
    billId: foundationsBill.id,
    costCode: "03-300",
    description: "Reinforced concrete strip foundations, C30/37, Blocks A–C",
    unit: "m3",
    quantity: 1_120,
    rate: 285,
    sortOrder: 1,
  });
  await addBqItem({
    billId: foundationsBill.id,
    costCode: "03-300",
    description: "Formwork to strip foundations",
    unit: "m2",
    quantity: 640,
    rate: 42,
    sortOrder: 2,
  });
  const framingBqItem = await addBqItem({
    billId: framingBill.id,
    costCode: "06-100",
    description: "Timber stud superstructure framing, Blocks A–C",
    unit: "m2",
    quantity: 9_400,
    rate: 38,
    sortOrder: 1,
  });
  const electricalBqItem = await addBqItem({
    billId: electricalBill.id,
    costCode: "26-000",
    description: "First-fix conduit and wiring, all units",
    unit: "point",
    quantity: 1_450,
    rate: 165,
    sortOrder: 1,
  });
  await addBqItem({
    billId: electricalBill.id,
    costCode: "26-000",
    description: "Provisional sum — utility company connection fees",
    unit: "sum",
    kind: "provisional_sum",
    amount: 12_000,
    sortOrder: 2,
  });
  const plumbingBqItem = await addBqItem({
    billId: plumbingBill.id,
    costCode: "22-000",
    description: "Copper pipework, first-fix, all units",
    unit: "m",
    quantity: 11_500,
    rate: 24,
    sortOrder: 1,
  });
  const finishesBqItem = await addBqItem({
    billId: decoratingBill.id,
    costCode: "09-900",
    description: "Emulsion paint decoration, 2 coats, all units",
    unit: "m2",
    quantity: 25_260,
    rate: 9.5,
    sortOrder: 1,
  });

  // ---------------------------------------------------------------------
  // Interim Payment Certificates — two certified periods, so the
  // valuations and CVR pages have real cumulative history to show.
  // ---------------------------------------------------------------------
  const ipc1 = await prisma.interimCertificate.create({
    data: {
      projectId: riverside.id,
      number: 1,
      certifiedDate: daysAgo(60),
      retentionPct: riverside.retentionPct,
      status: "certified",
      lines: {
        create: [
          { bqItemId: foundationBqItem.id, percentComplete: 100, valueToDate: foundationBqItem.amount },
          { bqItemId: framingBqItem.id, percentComplete: 40, valueToDate: framingBqItem.amount * 0.4 },
          { bqItemId: electricalBqItem.id, percentComplete: 0, valueToDate: 0 },
          { bqItemId: plumbingBqItem.id, percentComplete: 20, valueToDate: plumbingBqItem.amount * 0.2 },
          { bqItemId: finishesBqItem.id, percentComplete: 0, valueToDate: 0 },
        ],
      },
    },
  });
  await recomputeCertificate(ipc1.id);

  const ipc2 = await prisma.interimCertificate.create({
    data: {
      projectId: riverside.id,
      number: 2,
      certifiedDate: daysAgo(5),
      retentionPct: riverside.retentionPct,
      status: "certified",
      lines: {
        create: [
          { bqItemId: foundationBqItem.id, percentComplete: 100, valueToDate: foundationBqItem.amount },
          { bqItemId: framingBqItem.id, percentComplete: 92, valueToDate: framingBqItem.amount * 0.92 },
          { bqItemId: electricalBqItem.id, percentComplete: 45, valueToDate: electricalBqItem.amount * 0.45 },
          { bqItemId: plumbingBqItem.id, percentComplete: 38, valueToDate: plumbingBqItem.amount * 0.38 },
          { bqItemId: finishesBqItem.id, percentComplete: 0, valueToDate: 0 },
        ],
      },
    },
  });
  await recomputeCertificate(ipc2.id);

  // ---------------------------------------------------------------------
  // Contract administration — LAD terms, EOT claims, final account,
  // procurement. Riverside is still on schedule, so LAD exposure is
  // genuinely $0 right now (terms are configured, nothing accrued yet) —
  // the approved EOT below demonstrates the end-date cascade instead.
  // ---------------------------------------------------------------------
  await prisma.project.update({
    where: { id: riverside.id },
    data: { ladRatePerDay: 1_500, ladGraceDays: 7, ladCapPct: 10, hasFluctuationClause: true },
  });

  const weatherEot = await prisma.extensionOfTime.create({
    data: {
      projectId: riverside.id,
      code: "EOT-001",
      reason: "Exceptionally inclement weather delayed the foundation pour beyond the programmed allowance.",
      daysClaimed: 5,
      claimedDate: daysAgo(95),
    },
  });
  await updateEotStatus(weatherEot.id, "approved", 4);

  await prisma.extensionOfTime.create({
    data: {
      projectId: riverside.id,
      code: "EOT-002",
      reason: "Additional waterproofing works (VO-014) require programme time beyond the VO's own allowance.",
      daysClaimed: 3,
      claimedDate: daysAgo(3),
      linkedVoId: waterproofingVo.id,
    },
  });

  await prisma.finalAccount.create({
    data: {
      projectId: riverside.id,
      fluctuationAmount: 8_500,
      notes: "Steel price index adjustment per clause 13.8, Q2 2026.",
    },
  });

  const steelPackage = await prisma.procurementPackage.create({
    data: {
      projectId: riverside.id,
      name: "Structural Steel Package",
      costCode: "05-100",
      ownEstimate: 145_000,
      status: "awarded",
    },
  });
  await prisma.procurementQuote.createMany({
    data: [
      { packageId: steelPackage.id, subcontractor: "SteelWorks Inc.", amount: 152_000, submittedAt: daysAgo(70) },
      {
        packageId: steelPackage.id,
        subcontractor: "Apex Fabrication",
        amount: 138_500,
        notes: "2-week lead time, includes erection.",
        isAwarded: true,
        submittedAt: daysAgo(68),
        paymentStatus: "paid",
        paidAmount: 138_500,
        paidDate: daysAgo(50),
      },
      { packageId: steelPackage.id, subcontractor: "Bridgeline Steel", amount: 149_000, submittedAt: daysAgo(65) },
    ],
  });

  // A second, more recently awarded package — still unpaid, so the dashboard's
  // "subcontractor payments due" tile has something to show.
  const glazingPackage = await prisma.procurementPackage.create({
    data: {
      projectId: riverside.id,
      name: "Glazing Package",
      costCode: "08-400",
      ownEstimate: 62_000,
      status: "awarded",
    },
  });
  await prisma.procurementQuote.createMany({
    data: [
      { packageId: glazingPackage.id, subcontractor: "Clearview Glazing", amount: 59_500, submittedAt: daysAgo(12) },
      {
        packageId: glazingPackage.id,
        subcontractor: "Metro Glass & Glazing",
        amount: 64_000,
        isAwarded: true,
        submittedAt: daysAgo(10),
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Documents — a couple of real placeholder files on disk so the page
  // isn't just empty-state, and the download links actually resolve.
  // ---------------------------------------------------------------------
  async function seedDocument(input: {
    projectId: string;
    category: "drawing" | "contract" | "correspondence" | "other";
    name: string;
    version?: string;
    notes?: string;
    content: string;
  }) {
    const filename = `${randomUUID()}.txt`;
    const dir = path.join(process.cwd(), "public", "uploads", "documents", input.projectId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), input.content);

    await prisma.document.create({
      data: {
        projectId: input.projectId,
        category: input.category,
        name: input.name,
        version: input.version,
        notes: input.notes,
        fileUrl: `/uploads/documents/${input.projectId}/${filename}`,
        fileType: "text/plain",
      },
    });
  }

  await seedDocument({
    projectId: riverside.id,
    category: "drawing",
    name: "Structural drawings — Foundations",
    version: "Rev C",
    content: "Placeholder for structural foundation drawings, Rev C.",
  });
  await seedDocument({
    projectId: riverside.id,
    category: "contract",
    name: "Main contract — JCT D&B 2016",
    content: "Placeholder for the executed main contract.",
  });
  await seedDocument({
    projectId: riverside.id,
    category: "correspondence",
    name: "RFI-014 response — beam clash at Level 2",
    notes: "Basis for VO-011 pricing",
    content: "Placeholder RFI response confirming beam reroute.",
  });

  // ---------------------------------------------------------------------
  // Project 2: Harbor Point Office Fit-Out — smaller, mostly on track
  // ---------------------------------------------------------------------
  const harbor = await prisma.project.create({
    data: {
      name: "Harbor Point Office Fit-Out",
      type: "COMMERCIAL",
      clientName: "Northline Capital",
      contractValue: 1_180_000,
      startDate: daysAgo(45),
      endDate: daysFromNow(60),
      status: "active",
    },
  });

  const hvac = await prisma.budgetLine.create({
    data: {
      projectId: harbor.id,
      costCode: "23-000",
      category: "HVAC",
      budgeted: 210_000,
      committed: 210_000,
      actual: 95_000,
    },
  });
  await prisma.budgetLine.create({
    data: {
      projectId: harbor.id,
      costCode: "09-200",
      category: "Ceilings & Partitions",
      budgeted: 165_000,
      committed: 165_000,
      actual: 60_000,
    },
  });

  const hvacTask = await prisma.scheduleTask.create({
    data: {
      projectId: harbor.id,
      name: "Install rooftop HVAC units",
      costCode: "23-000",
      startDate: daysAgo(10),
      endDate: daysFromNow(15),
      percentComplete: 55,
      status: "in_progress",
    },
  });

  await prisma.variationOrder.create({
    data: {
      projectId: harbor.id,
      code: "VO-003",
      title: "Add rooftop unit vibration isolators",
      costImpact: 4_800,
      scheduleImpactDays: 1,
      status: "submitted",
      submittedAt: daysAgo(2),
      budgetLineId: hvac.id,
      scheduleTaskId: hvacTask.id,
    },
  });

  // Open package, no quotes yet — exercises that empty state within a real
  // project rather than only the top-level "no projects" case.
  await prisma.procurementPackage.create({
    data: {
      projectId: harbor.id,
      name: "HVAC Controls Package",
      costCode: "23-000",
      ownEstimate: 38_000,
    },
  });

  await seedDocument({
    projectId: harbor.id,
    category: "drawing",
    name: "MEP layout — Level 1",
    version: "Rev A",
    content: "Placeholder for MEP layout drawing, Level 1, Rev A.",
  });

  console.log("Seed complete:", {
    projects: 2,
    budgetLines: 7,
    scheduleTasks: 7,
    variationOrders: 6,
    inspections: 2,
    defects: 1,
    rateLibraryItems: 7,
    bqItems: 7,
    interimCertificates: 2,
    extensionsOfTime: 2,
    procurementPackages: 3,
    documents: 4,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
