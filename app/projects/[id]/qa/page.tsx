import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { DEFECT_STATUS_LABEL, DEFECT_STATUS_TONE, formatDate } from "@/lib/format";
import { closeDefect, createTemplate, startInspection } from "./actions";

export const dynamic = "force-dynamic";

export default async function QaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [inspections, templates, tasks, defects] = await Promise.all([
    prisma.inspection.findMany({
      where: { projectId: id },
      orderBy: { inspectedAt: "desc" },
      include: { task: true, template: true, results: { include: { defect: true } } },
    }),
    prisma.checklistTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.scheduleTask.findMany({ where: { projectId: id }, orderBy: { startDate: "asc" } }),
    prisma.defect.findMany({
      where: { result: { inspection: { projectId: id } } },
      orderBy: { raisedAt: "desc" },
      include: { result: { include: { inspection: true } } },
    }),
  ]);

  const openDefects = defects.filter((d) => d.status !== "closed");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Open defects {openDefects.length > 0 && <span className="text-text-muted">({openDefects.length})</span>}
        </h2>
        {openDefects.length === 0 ? (
          <p className="text-sm text-text-secondary">No open defects.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--gridline)]">
            {openDefects.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">{d.description}</div>
                  <div className="text-xs text-text-muted">
                    {d.result.inspection.location ? `${d.result.inspection.location} · ` : ""}
                    Raised {formatDate(d.raisedAt)} · {d.severity}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={DEFECT_STATUS_TONE[d.status] ?? "neutral"} label={DEFECT_STATUS_LABEL[d.status] ?? d.status} />
                  <form action={closeDefect.bind(null, id, d.id)}>
                    <button className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                      Close
                    </button>
                  </form>
                  <Link
                    href={`/projects/${id}/qa/${d.result.inspection.id}`}
                    className="text-xs text-cat-1 hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Inspections</h2>
        {inspections.length === 0 ? (
          <p className="text-sm text-text-secondary">No inspections run yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--gridline)]">
            {inspections.map((i) => {
              const failCount = i.results.filter((r) => r.passed === false).length;
              return (
                <Link
                  key={i.id}
                  href={`/projects/${id}/qa/${i.id}`}
                  className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0 hover:bg-page"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary">
                      {i.template.name} — {i.task.name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {formatDate(i.inspectedAt)}
                      {i.location ? ` · ${i.location}` : ""} · {i.results.length} items
                      {failCount > 0 ? ` · ${failCount} failed` : ""}
                    </div>
                  </div>
                  <Badge tone={i.status === "complete" ? "good" : "warning"} label={i.status === "complete" ? "Complete" : "In progress"} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Start inspection</summary>
        {templates.length === 0 || tasks.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            {tasks.length === 0
              ? "Add a schedule task first."
              : "Create a checklist template below first."}
          </p>
        ) : (
          <form action={startInspection.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Schedule task / location</span>
              <select
                name="taskId"
                required
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Checklist template</span>
              <select
                name="templateId"
                required
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Location (optional)</span>
              <input
                name="location"
                placeholder="Block B — Level 2"
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Inspector (optional)</span>
              <input
                name="inspectedBy"
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Start inspection
              </button>
            </div>
          </form>
        )}
      </details>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ New checklist template</summary>
        <form action={createTemplate.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Template name</span>
            <input
              name="name"
              required
              placeholder="Electrical First-Fix Inspection"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Category (optional)</span>
            <input
              name="category"
              placeholder="Electrical"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Checklist items — one per line</span>
            <textarea
              name="items"
              required
              rows={5}
              placeholder={"Conduit routing per drawings\nBox fill within code\nGrounding continuity verified"}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div>
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create template
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
