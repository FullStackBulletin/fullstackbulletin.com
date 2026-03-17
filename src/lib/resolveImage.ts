/**
 * Maps a local image reference (e.g. "./hash.ext") from a metadata.json
 * to the public archive-images path (e.g. "/archive-images/hash.ext").
 */
export function resolveImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('./')) {
    return `/archive-images/${imageUrl.slice(2)}`;
  }
  // Already an absolute URL — return as-is
  return imageUrl;
}
