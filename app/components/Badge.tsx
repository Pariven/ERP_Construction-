import { BadgeTone, toneVar } from "@/lib/format";

export function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  const color = toneVar[tone];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-text-primary"
      style={{
        // Mixes toward the actual surface color (not "transparent"), so the
        // tint stays consistent regardless of what's behind it — a card, a
        // hovered table row, etc. — and reads correctly in both themes since
        // --surface-1 and the status color both already carry their own
        // light/dark values.
        backgroundColor: `color-mix(in oklab, ${color} 16%, var(--surface-1))`,
        border: `1px solid color-mix(in oklab, ${color} 40%, var(--surface-1))`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 22%, transparent)`,
        }}
      />
      {label}
    </span>
  );
}
