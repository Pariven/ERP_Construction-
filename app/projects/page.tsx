import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import {
  PROJECT_STATUS_TONE,
  PROJECT_TYPE_LABEL,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import { createProject } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      budgetLines: true,
      variations: true,
      tasks: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
          No projects yet — create your first one below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const openVos = p.variations.filter(
            (v) => v.status === "submitted" || v.status === "disputed"
          ).length;
          const actual = p.budgetLines.reduce((s, b) => s + b.actual, 0);
          const budgeted = p.budgetLines.reduce((s, b) => s + b.budgeted, 0);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-text-primary group-hover:underline">
                    {p.name}
                  </div>
                  <div className="text-xs text-text-secondary">{p.clientName}</div>
                </div>
                <Badge tone={PROJECT_STATUS_TONE[p.status] ?? "neutral"} label={p.status.replace("_", " ")} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                <span>{PROJECT_TYPE_LABEL[p.type] ?? p.type}</span>
                <span>{formatDate(p.startDate)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-hairline)] pt-3 text-xs">
                <div>
                  <div className="text-text-muted">Contract</div>
                  <div className="tabular-nums font-medium text-text-primary">
                    {formatCurrency(p.contractValue)}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">Budget used</div>
                  <div className="tabular-nums font-medium text-text-primary">
                    {budgeted > 0 ? `${Math.round((actual / budgeted) * 100)}%` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">Open VOs</div>
                  <div className="tabular-nums font-medium text-text-primary">{openVos}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">
          + New project
        </summary>
        <form action={createProject} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Project name</span>
            <input
              name="name"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              placeholder="Riverside Residences"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Client</span>
            <input
              name="clientName"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              placeholder="Maple Grove Developments"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Type</span>
            <select
              name="type"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            >
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="SUBCON">Subcontract</option>
              <option value="RENOVATION">Renovation</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Contract value (USD)</span>
            <input
              name="contractValue"
              type="number"
              min="0"
              step="1000"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              placeholder="1500000"
            />
          </label>
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
            <span className="text-text-secondary">Target end date</span>
            <input
              name="endDate"
              type="date"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create project
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
