"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectThumb } from "./ProjectThumb";

type ProjectSummary = { id: string; name: string; imageUrl: string | null; updatedAt: Date };

export function SidebarNav({ projects }: { projects: ProjectSummary[] }) {
  const pathname = usePathname();
  const dashboardActive = pathname === "/projects";
  const rateLibraryActive = pathname === "/rates";
  const insideProject = pathname?.startsWith("/projects/") ?? false;

  const [open, setOpen] = useState(insideProject);

  // Auto-expand the moment navigation lands inside a project, so the active
  // project stays visible; doesn't fight a manual collapse afterwards.
  useEffect(() => {
    if (insideProject) setOpen(true);
  }, [insideProject]);

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      <Link
        href="/projects"
        className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
          dashboardActive ? "bg-page text-text-primary" : "text-text-secondary hover:bg-page hover:text-text-primary"
        }`}
      >
        Dashboard
      </Link>

      {projects.length > 0 && (
        <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2.5 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-page hover:text-text-primary [&::-webkit-details-marker]:hidden">
            Projects
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 group-open:rotate-90"
            >
              <path d="M7 5l6 5-6 5V5z" />
            </svg>
          </summary>
          <div className="ml-1 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--gridline)] pl-2">
            {projects.map((p) => {
              const href = `/projects/${p.id}`;
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={p.id}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-page text-text-primary" : "text-text-secondary hover:bg-page hover:text-text-primary"
                  }`}
                >
                  <ProjectThumb imageUrl={p.imageUrl} updatedAt={p.updatedAt} name={p.name} size={20} />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </div>
        </details>
      )}

      <Link
        href="/rates"
        className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
          rateLibraryActive ? "bg-page text-text-primary" : "text-text-secondary hover:bg-page hover:text-text-primary"
        }`}
      >
        Rate Library
      </Link>
    </nav>
  );
}
