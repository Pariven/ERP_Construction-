import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";

export const metadata: Metadata = {
  title: "BuildTrack",
  description: "Project, budget, schedule, VO and QA tracking for construction projects",
};

// The sidebar queries the database on every render (project list for the
// switcher), and this layout wraps every route including the built-in
// /_not-found page — without this, `next build` tries to statically
// pre-render that page, which runs the query at build time rather than
// request time. Locally that's masked because DATABASE_URL happens to be
// set for local SQLite; on Vercel, with no DB reachable at build time, it
// fails the whole build. Every page in this app already reads live data
// (`dynamic = "force-dynamic"` per-page) — there's no meaningful static
// page here anyway, so forcing it at the layout level closes this gap for
// the one route that isn't a normal page.
export const dynamic = "force-dynamic";

// Applies a saved theme choice before first paint so switching pages (or
// reloading) never flashes the OS-default theme before snapping to the
// viewer's actual pick.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex bg-page text-text-primary" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Sidebar />
        <div className="flex min-h-full flex-1 flex-col">
          <header className="border-b border-[var(--border-hairline)] bg-surface-1 md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/projects" className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cat-1 text-sm font-bold text-white"
                >
                  B
                </span>
                BuildTrack
              </Link>
              <nav className="flex items-center gap-4 text-sm text-text-secondary">
                <Link href="/projects" className="hover:text-text-primary">
                  Dashboard
                </Link>
                <Link href="/rates" className="hover:text-text-primary">
                  Rate Library
                </Link>
                <ThemeToggle className="px-0 hover:bg-transparent" />
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
          <footer className="border-t border-[var(--border-hairline)] py-4 text-center text-xs text-text-muted">
            BuildTrack — local MVP running on SQLite
          </footer>
        </div>
      </body>
    </html>
  );
}
