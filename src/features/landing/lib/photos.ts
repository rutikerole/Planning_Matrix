/**
 * Unsplash hotlinks for the landing v1.
 *
 * If any URL returns 404, swap for an equivalent of the same subject:
 *   - hero          → German residential building (Altbau / facade)
 *   - perspectives1 → architect at desk
 *   - perspectives2 → building plans / drawing table
 *   - trust         → German government building
 *
 * All <img> elements using these MUST set loading="lazy", decoding="async",
 * explicit width + height, and a meaningful alt — see the components.
 */
export const photos = {
  hero:
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=900&q=80',
  perspectives1:
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
  perspectives2:
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80',
  trust:
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=900&q=80',
} as const
