import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Revalidate every hour. Stories and authors don't change addresses
// frequently and a slightly stale sitemap is fine for crawlers.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  // Hard cap to avoid OOM on huge result sets; if we ever cross 5k stories,
  // split into multiple sitemap files via the `id` route segment.
  const stories = await prisma.story.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: { id: true, updatedAt: true },
  });

  const storyEntries: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${SITE_URL}/story/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Only authors with at least one published story.
  const authors = await prisma.user.findMany({
    where: { stories: { some: { status: "PUBLISHED" } } },
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: { username: true, updatedAt: true },
  });

  const authorEntries: MetadataRoute.Sitemap = authors.map((u) => ({
    url: `${SITE_URL}/users/${u.username}`,
    lastModified: u.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...storyEntries, ...authorEntries];
}
