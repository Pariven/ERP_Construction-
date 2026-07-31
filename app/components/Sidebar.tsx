import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "./SidebarNav";
import { ThemeToggle } from "./ThemeToggle";

export async function Sidebar() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true, updatedAt: true },
  });

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-[var(--border-hairline)] bg-surface-1 md:flex">
      <Link href="/projects" className="flex items-center gap-2 px-4 py-4 font-semibold tracking-tight">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cat-1 text-sm font-bold text-white"
        >
          B
        </span>
        BuildTrack
      </Link>

      <SidebarNav projects={projects} />

      {/* SidebarProjectNav (rendered from the project layout) portals its
          content here whenever the current route is inside a project. */}
      <div id="sidebar-project-slot" className="mt-2 flex flex-1 flex-col" />

      <div className="mt-auto border-t border-[var(--border-hairline)] px-2 py-2">
        <ThemeToggle />
      </div>
      <div className="px-4 pb-4 text-xs text-text-muted">BuildTrack — local MVP on SQLite</div>
    </aside>
  );
}
