import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { StatTile } from "@/app/components/StatTile";
import { calculateLadExposure } from "@/lib/eot";
import { EOT_STATUS_LABEL, EOT_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { createEot, transitionEot, updateLadTerms } from "./actions";

export const dynamic = "force-dynamic";

export default async function EotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, eots, variations] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id } }),
    prisma.extensionOfTime.findMany({
      where: { projectId: id },
      orderBy: { claimedDate: "desc" },
      include: { linkedVo: true },
    }),
    prisma.variationOrder.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  const lad = calculateLadExposure(project);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Contractual completion"
          value={project.endDate ? formatDate(project.endDate) : "—"}
          accent="var(--cat-1)"
          sub="Reflects all approved EOTs"
        />
        <StatTile
          label="Days overrun"
          value={lad.daysOverrun}
          accent="var(--status-warning)"
          sub={lad.graceEndDate ? `Grace ends ${formatDate(lad.graceEndDate)}` : "No grace period set"}
        />
        <StatTile
          label="LAD exposure"
          value={formatCurrency(lad.exposure)}
          accent="var(--status-critical)"
          sub={lad.isCapped ? `Capped at ${project.ladCapPct}% of contract value` : `${formatCurrency(project.ladRatePerDay)}/day`}
        />
        <StatTile
          label="Open EOT claims"
          value={eots.filter((e) => e.status === "claimed" || e.status === "under_review").length}
          accent="var(--status-warning)"
          sub={`${eots.filter((e) => e.status === "approved").length} approved`}
        />
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">LAD contract terms</summary>
        <form action={updateLadTerms.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">LAD rate per day (RM)</span>
            <input
              name="ladRatePerDay"
              type="number"
              min="0"
              step="10"
              defaultValue={project.ladRatePerDay}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Grace period (days)</span>
            <input
              name="ladGraceDays"
              type="number"
              min="0"
              step="1"
              defaultValue={project.ladGraceDays}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Cap (% of contract value, optional)</span>
            <input
              name="ladCapPct"
              type="number"
              min="0"
              step="0.5"
              defaultValue={project.ladCapPct ?? ""}
              placeholder="e.g. 10"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save terms
            </button>
          </div>
        </form>
      </details>

      <div className="flex flex-col gap-3">
        {eots.map((eot) => {
          const underReview = transitionEot.bind(null, id, eot.id, "under_review");
          const approve = transitionEot.bind(null, id, eot.id, "approved");
          const reject = transitionEot.bind(null, id, eot.id, "rejected");
          return (
            <div key={eot.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{eot.code}</span>
                    <Badge tone={EOT_STATUS_TONE[eot.status] ?? "neutral"} label={EOT_STATUS_LABEL[eot.status] ?? eot.status} />
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{eot.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>
                      Claimed:{" "}
                      <span className="tabular-nums font-medium text-text-primary">{eot.daysClaimed}d</span>
                    </span>
                    {eot.daysApproved !== null && (
                      <span>
                        Approved:{" "}
                        <span className="tabular-nums font-medium text-text-primary">{eot.daysApproved}d</span>
                      </span>
                    )}
                    {eot.linkedVo && <span>Linked to {eot.linkedVo.code}</span>}
                    <span>Filed {formatDate(eot.claimedDate)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {eot.status === "claimed" && (
                    <form action={underReview}>
                      <button className="rounded-md border border-[var(--border-hairline)] px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">
                        Mark under review
                      </button>
                    </form>
                  )}
                  {(eot.status === "claimed" || eot.status === "under_review") && (
                    <>
                      <form action={approve} className="flex items-center gap-1">
                        <input
                          name="daysApproved"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={eot.daysClaimed}
                          className="w-16 rounded-md border border-[var(--border-hairline)] bg-page px-2 py-1 text-xs outline-none focus:border-cat-1"
                        />
                        <button className="rounded-md bg-cat-1 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90">
                          Approve
                        </button>
                      </form>
                      <form action={reject}>
                        <button className="rounded-md border border-[var(--status-critical)] px-2.5 py-1 text-xs font-medium text-[var(--status-critical)] hover:opacity-80">
                          Reject
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {eots.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
            No EOT claims yet — log the first one below.
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Log EOT claim</summary>
        <form action={createEot.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">EOT code</span>
            <input
              name="code"
              required
              placeholder="EOT-003"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Days claimed</span>
            <input
              name="daysClaimed"
              type="number"
              min="1"
              step="1"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Reason</span>
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="Exceptionally inclement weather, week of..."
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Linked variation order (optional)</span>
            <select
              name="linkedVoId"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            >
              <option value="">— none, standalone delay claim —</option>
              {variations.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} — {v.title}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Log EOT claim
            </button>
          </div>
        </form>
      </details>

      <p className="text-xs text-text-muted">
        Approving an EOT pushes the project&apos;s contractual completion date out by the approved days,
        automatically — LAD exposure above is measured against that date, not the original.
      </p>
    </div>
  );
}
