import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { DEFECT_STATUS_LABEL, DEFECT_STATUS_TONE, formatDate } from "@/lib/format";
import { completeInspection, setDefectStatus, setResult } from "./actions";

export const dynamic = "force-dynamic";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; inspectionId: string }>;
}) {
  const { id, inspectionId } = await params;

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      task: true,
      template: true,
      results: { include: { defect: true } },
    },
  });
  if (!inspection || inspection.projectId !== id) notFound();

  const allReviewed = inspection.results.every((r) => r.passed !== null);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/projects/${id}/qa`} className="text-xs text-text-muted hover:text-text-secondary">
        ← QA / QC
      </Link>

      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-medium text-text-primary">{inspection.template.name}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {inspection.task.name}
              {inspection.location ? ` · ${inspection.location}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {formatDate(inspection.inspectedAt)}
              {inspection.inspectedBy ? ` · ${inspection.inspectedBy}` : ""}
            </p>
          </div>
          <Badge
            tone={inspection.status === "complete" ? "good" : "warning"}
            label={inspection.status === "complete" ? "Complete" : "In progress"}
          />
        </div>

        {inspection.status !== "complete" && (
          <form action={completeInspection.bind(null, id, inspection.id)} className="mt-3">
            <button
              type="submit"
              disabled={!allReviewed}
              className="rounded-md bg-cat-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {allReviewed ? "Mark inspection complete" : "Review all items to complete"}
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {inspection.results.map((r) => {
          const action = setResult.bind(null, id, inspection.id, r.id);
          return (
            <div key={r.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-text-primary">{r.itemLabel}</div>
                {r.passed === true && <Badge tone="good" label="Pass" />}
                {r.passed === false && <Badge tone="critical" label="Fail" />}
                {r.passed === null && <Badge tone="neutral" label="Pending" />}
              </div>

              <form action={action} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-4 text-sm sm:col-span-2">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="passed" value="pass" defaultChecked={r.passed === true} />
                    Pass
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="passed" value="fail" defaultChecked={r.passed === false} />
                    Fail
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="text-text-secondary">Notes</span>
                  <input
                    name="notes"
                    defaultValue={r.notes ?? ""}
                    className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                  />
                </label>

                <div className="rounded-md border border-dashed border-[var(--border-hairline)] p-2.5 text-xs text-text-muted sm:col-span-2">
                  If marked <strong>Fail</strong>, this raises (or updates) a defect:
                </div>
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="text-text-secondary">Defect description</span>
                  <input
                    name="defectDescription"
                    defaultValue={r.defect?.description ?? ""}
                    className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-text-secondary">Severity</span>
                  <select
                    name="severity"
                    defaultValue={r.defect?.severity ?? "medium"}
                    className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-text-secondary">Corrective action</span>
                  <input
                    name="correctiveAction"
                    defaultValue={r.defect?.correctiveAction ?? ""}
                    className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    Save item
                  </button>
                </div>
              </form>

              {r.defect && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--gridline)] pt-3">
                  <Badge
                    tone={DEFECT_STATUS_TONE[r.defect.status] ?? "neutral"}
                    label={DEFECT_STATUS_LABEL[r.defect.status] ?? r.defect.status}
                  />
                  <div className="flex gap-1.5">
                    {r.defect.status !== "in_progress" && (
                      <form action={setDefectStatus.bind(null, id, inspection.id, r.defect.id, "in_progress")}>
                        <button className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                          Mark in progress
                        </button>
                      </form>
                    )}
                    {r.defect.status !== "closed" && (
                      <form action={setDefectStatus.bind(null, id, inspection.id, r.defect.id, "closed")}>
                        <button className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                          Close defect
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
