"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_TABS } from "@/lib/nav";

// Portals a project-scoped nav section into the persistent sidebar's
// #sidebar-project-slot (see Sidebar.tsx), so switching projects doesn't
// remount the sidebar shell — only this section's content changes.
export function SidebarProjectNav({ projectId, projectName }: { projectId: string; projectName: string }) {
  const pathname = usePathname();
  const [slot, setSlot] = useState<Element | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("sidebar-project-slot"));
  }, []);

  if (!slot) return null;

  const base = `/projects/${projectId}`;

  return createPortal(
    <div className="mt-3 flex flex-1 flex-col border-t border-[var(--border-hairline)] pt-3">
      <Link
        href="/projects"
        className="px-4 pb-2 text-xs text-text-muted hover:text-text-secondary"
      >
        ← Dashboard
      </Link>
      <div className="truncate px-4 pb-2 text-sm font-semibold text-text-primary">{projectName}</div>
      <nav className="flex flex-col gap-0.5 px-2">
        {PROJECT_TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === "" ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-page text-text-primary" : "text-text-secondary hover:bg-page hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>,
    slot
  );
}
