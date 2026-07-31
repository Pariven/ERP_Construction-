import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { VO_STATUS_LABEL, VO_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { createVariationOrder, transitionVo } from "./actions";

export const dynamic = "force-dynamic";

function ActionButton({
  action,
  label,
  variant = "default",
}: {
  action: () => Promise<void>;
  label: string;
  variant?: "default" | "primary" | "danger";
}) {
  const styles = {
    default: "border border-[var(--border-hairline)] text-text-secondary hover:text-text-primary",
    primary: "bg-cat-1 text-white hover:opacity-90",
    danger: "border border-[var(--status-critical)] text-[var(--status-critical)] hover:opacity-80",
  }[variant];
  return (
    <form action={action}>
      <button type="submit" className={`rounded-md px-2.5 py-1 text-xs font-medium ${styles}`}>
        {label}
      </button>
    </form>
  );
}

export default async function VariationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [variations, budgetLines, tasks] = await Promise.all([
    prisma.variationOrder.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: { budgetLine: true, scheduleTask: true },
    }),
    prisma.budgetLine.findMany({ where: { projectId: id }, orderBy: { costCode: "asc" } }),
    prisma.scheduleTask.findMany({ where: { projectId: id }, orderBy: { startDate: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {variations.map((v) => {
          const submit = transitionVo.bind(null, id, v.id, "submitted");
          const approve = transitionVo.bind(null, id, v.id, "approved");
          const dispute = transitionVo.bind(null, id, v.id, "disputed");
          const reject = transitionVo.bind(null, id, v.id, "rejected");

          return (
            <div key={v.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{v.code}</span>
                    <Badge tone={VO_STATUS_TONE[v.status] ?? "neutral"} label={VO_STATUS_LABEL[v.status] ?? v.status} />
                  </div>
                  <div className="mt-0.5 text-sm text-text-secondary">{v.title}</div>
                  {v.description && <p className="mt-1 text-xs text-text-muted">{v.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>
                      Cost impact:{" "}
                      <span className="tabular-nums font-medium text-text-primary">
                        {formatCurrency(v.costImpact)}
                      </span>
                    </span>
                    {v.scheduleImpactDays !== 0 && (
                      <span>
                        Schedule impact:{" "}
                        <span className="tabular-nums font-medium text-text-primary">
                          {v.scheduleImpactDays}d
                        </span>
                      </span>
                    )}
                    {v.budgetLine && <span>→ {v.budgetLine.costCode} {v.budgetLine.category}</span>}
                    {v.scheduleTask && <span>→ {v.scheduleTask.name}</span>}
                  </div>
                  {v.approvedAt && (
                    <div className="mt-1 text-xs text-[var(--success-text)]">
                      Approved {formatDate(v.approvedAt)} — budget and schedule updated automatically.
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {v.status === "draft" && <ActionButton action={submit} label="Submit" variant="primary" />}
                  {v.status === "submitted" && (
                    <>
                      <ActionButton action={approve} label="Approve" variant="primary" />
                      <ActionButton action={dispute} label="Dispute" variant="danger" />
                    </>
                  )}
                  {v.status === "disputed" && (
                    <>
                      <ActionButton action={approve} label="Approve" variant="primary" />
                      <ActionButton action={reject} label="Reject" variant="danger" />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {variations.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
            No variation orders yet — log the first one below.
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Log variation order</summary>
        <form action={createVariationOrder.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">VO code</span>
            <input
              name="code"
              required
              placeholder="VO-017"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Title</span>
            <input
              name="title"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Description (optional)</span>
            <textarea
              name="description"
              rows={2}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Cost impact (RM)</span>
            <input
              name="costImpact"
              type="number"
              step="100"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Schedule impact (days)</span>
            <input
              name="scheduleImpactDays"
              type="number"
              step="1"
              defaultValue={0}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Linked budget line (optional)</span>
            <select
              name="budgetLineId"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            >
              <option value="">— none —</option>
              {budgetLines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.costCode} — {b.category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Linked schedule task (optional)</span>
            <select
              name="scheduleTaskId"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            >
              <option value="">— none —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Log VO (as draft)
            </button>
          </div>
        </form>
      </details>

      <p className="text-xs text-text-muted">
        Approving a VO pushes its cost impact into the linked budget line&apos;s committed amount and shifts the
        linked schedule task&apos;s dates by the schedule impact — automatically, in one transaction.
      </p>
    </div>
  );
}
