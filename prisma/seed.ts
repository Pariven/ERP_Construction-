import { PrismaClient } from "@prisma/client";
import { updateVariationOrderStatus } from "../lib/variations";

const prisma = new PrismaClient();

async function main() {
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
  await prisma.variationOrder.create({
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

  console.log("Seed complete:", {
    projects: 2,
    budgetLines: 7,
    scheduleTasks: 7,
    variationOrders: 6,
    inspections: 2,
    defects: 1,
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
