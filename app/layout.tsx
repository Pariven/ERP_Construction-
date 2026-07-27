import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildTrack",
  description: "Project, budget, schedule, VO and QA tracking for construction projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-page text-text-primary">
        <header className="border-b border-[var(--border-hairline)] bg-surface-1">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/projects" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cat-1 text-sm font-bold text-white"
              >
                B
              </span>
              BuildTrack
            </Link>
            <nav className="flex items-center gap-5 text-sm text-text-secondary">
              <Link href="/projects" className="hover:text-text-primary">
                Projects
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-[var(--border-hairline)] py-4 text-center text-xs text-text-muted">
          BuildTrack — local MVP running on SQLite
        </footer>
      </body>
    </html>
  );
}
