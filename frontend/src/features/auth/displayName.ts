export function resolveDisplayName(name: string | null | undefined, fallback: string | null | undefined) {
  const normalizedName = name?.trim();
  if (normalizedName) return normalizedName;

  const normalizedFallback = fallback?.trim();
  if (normalizedFallback) return normalizedFallback;

  return "Guest";
}

export function getDisplayNameInitials(name: string | null | undefined) {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "G";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
