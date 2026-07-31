"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_TABS as TABS } from "@/lib/nav";

// Horizontal tab bar — used as the mobile fallback nav (below md, where the
// sidebar's project section is hidden). See Sidebar.tsx / SidebarProjectNav.tsx
// for the desktop equivalent.
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border-hairline)]">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href === "" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-cat-1 text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
