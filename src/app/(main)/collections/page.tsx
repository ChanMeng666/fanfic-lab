import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { getPublicCollections, getMyCollections } from "@/lib/actions/collection";
import {
  CollectionsBrowse,
  type CollectionSummary,
} from "@/components/collections/CollectionsBrowse";

export const metadata: Metadata = {
  title: "专题合集",
  description: "由社区策展的主题书单 — 成组发现好故事。",
};

export default async function CollectionsPage() {
  let isLoggedIn = false;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      isLoggedIn = !!dbUser;
    }
  } catch {
    // anonymous
  }

  const publicRaw = await getPublicCollections({ limit: 60 });
  const myRaw = isLoggedIn ? await getMyCollections() : [];

  const publicCollections: CollectionSummary[] = publicRaw.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    isPublic: c.isPublic,
    ownerName: c.owner.displayName || c.owner.username,
    ownerUsername: c.owner.username,
    storyCount: c._count.stories,
  }));

  const myCollections: CollectionSummary[] = myRaw.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    isPublic: c.isPublic,
    ownerName: "我",
    ownerUsername: "",
    storyCount: c._count.stories,
  }));

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <CollectionsBrowse
          publicCollections={publicCollections}
          myCollections={myCollections}
          isLoggedIn={isLoggedIn}
        />
      </main>
    </div>
  );
}
