/**
 * Canonical site URL used by metadata, OG tags, sitemap, and any other
 * absolute-URL emitter. Falls back to the production domain if the env
 * var is missing so SSR rendering doesn't ship `localhost` references.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fanfic-lab.tech"
).replace(/\/$/, "");

export const SITE_NAME = "FanFic Lab";

export const SITE_TAGLINE = "AI 协作的同人文创作工坊";

export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}
