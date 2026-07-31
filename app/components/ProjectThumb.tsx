export function ProjectThumb({
  imageUrl,
  updatedAt,
  name,
  size = 40,
}: {
  imageUrl: string | null;
  updatedAt: Date;
  name: string;
  size?: number;
}) {
  if (imageUrl) {
    return (
      // Local /uploads path with a dynamic filename per project — plain
      // <img> avoids next/image's remote-pattern/static-analysis friction.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${imageUrl}?v=${updatedAt.getTime()}`}
        alt={name}
        className="shrink-0 rounded-md border border-[var(--border-hairline)] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md font-semibold text-cat-1"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: "color-mix(in srgb, var(--cat-1) 15%, transparent)",
      }}
    >
      {initial}
    </div>
  );
}
