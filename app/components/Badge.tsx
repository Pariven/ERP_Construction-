import { BadgeTone, toneVar } from "@/lib/format";

export function Badge({ tone, label }: { tone: BadgeTone; label: string }) {
  const color = toneVar[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-text-secondary"
      style={{ borderColor: "var(--border-hairline)", backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
