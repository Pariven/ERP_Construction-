import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { TASK_STATUS_LABEL, TASK_STATUS_TONE, formatDate } from "@/lib/format";
import { addScheduleTask, updateTaskProgress } from "./actions";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tasks = await prisma.scheduleTask.findMany({
    where: { projectId: id },
    orderBy: { startDate: "asc" },
    include: { variations: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {tasks.map((t) => {
          const linkedVo = t.variations.find((v) => v.status !== "draft");
          const updateAction = updateTaskProgress.bind(null, id, t.id);
          return (
            <div key={t.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-text-primary">{t.name}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {t.costCode ? `${t.costCode} · ` : ""}
                    {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  </div>
                </div>
                <Badge tone={TASK_STATUS_TONE[t.status] ?? "neutral"} label={TASK_STATUS_LABEL[t.status] ?? t.status} />
              </div>

              {linkedVo && (
                <div className="mt-2 text-xs text-text-muted">
                  Linked to {linkedVo.code} — dates reflect the approved schedule impact.
                </div>
              )}

              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--gridline)]">
                  <div
                    className="h-2 rounded-full bg-cat-1"
                    style={{ width: `${Math.min(100, Math.max(0, t.percentComplete))}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-secondary">
                  {t.percentComplete}%
                </span>
              </div>

              <form action={updateAction} className="mt-3 flex items-center gap-2">
                <span className="text-xs text-text-secondary">Update % complete:</span>
                <input
                  name="percentComplete"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={t.percentComplete}
                  className="w-20 rounded-md border border-[var(--border-hairline)] bg-page px-2 py-1 text-xs outline-none focus:border-cat-1"
                />
                <button
                  type="submit"
                  className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                >
                  Save
                </button>
              </form>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
            No schedule tasks yet — add the first one below.
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Add schedule task</summary>
        <form action={addScheduleTask.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Task name</span>
            <input
              name="name"
              required
              placeholder="Frame superstructure — Block D"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Cost code (optional — links to budget)</span>
            <input
              name="costCode"
              placeholder="06-100"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Start date</span>
            <input
              name="startDate"
              type="date"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">End date</span>
            <input
              name="endDate"
              type="date"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add task
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
