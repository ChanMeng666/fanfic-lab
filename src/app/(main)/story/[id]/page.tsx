import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Copy } from "lucide-react";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { StoryReader } from "@/components/story/StoryReader";
import { RelatedStories } from "@/components/story/RelatedStories";
import { BranchTree } from "@/components/story/BranchTree";
import { BranchPolls } from "@/components/story/BranchPolls";
import { getBranchTree } from "@/lib/actions/branch";
import { getPollsForStory } from "@/lib/actions/poll";
import { getRemixes } from "@/lib/actions/remix";
import { getReactionSummary } from "@/lib/actions/reaction";
import { getStoryProgress } from "@/lib/actions/reading-progress";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      title: true,
      summary: true,
      fandom: true,
      ships: true,
      coverImageUrl: true,
      status: true,
      author: { select: { displayName: true, username: true } },
    },
  });

  if (!story || story.status === "DRAFT") {
    return {
      title: "故事未找到",
      robots: { index: false, follow: false },
    };
  }

  const authorName = story.author.displayName || story.author.username;
  const description =
    story.summary?.slice(0, 200) ?? `${authorName} 的同人文，关于 ${story.fandom}。`;
  const title = `${story.title} - ${authorName}`;
  const url = absoluteUrl(`/story/${id}`);
  const images = story.coverImageUrl ? [{ url: story.coverImageUrl }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      authors: [authorName],
      tags: [story.fandom, ...story.ships],
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: story.coverImageUrl ? [story.coverImageUrl] : undefined,
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          displayName: true,
          username: true,
        },
      },
      // Metadata only — chapter bodies are not shipped to the overview. The
      // single-chapter body is fetched separately below; multi-chapter serials
      // read each chapter on its own /chapter/[n] page.
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          title: true,
          chapterNumber: true,
          wordCount: true,
        },
      },
      remixedFrom: {
        select: { id: true, title: true, author: { select: { username: true } } },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!story) {
    notFound();
  }

  // One-shots (single chapter) stay a one-page read: pull that chapter's body
  // so the overview can render it inline.
  let firstChapterContent: string | null = null;
  if (story.chapters.length === 1) {
    const first = await prisma.chapter.findFirst({
      where: { storyId: id },
      orderBy: { chapterNumber: "asc" },
      select: { content: true },
    });
    firstChapterContent = first?.content ?? null;
  }

  let initialLiked = false;
  let initialBookmarked = false;
  let currentUserId: string | null = null;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      if (dbUser) {
        currentUserId = dbUser.id;
        const [like, bookmark] = await Promise.all([
          prisma.like.findUnique({
            where: { userId_storyId: { userId: dbUser.id, storyId: id } },
          }),
          prisma.bookmark.findUnique({
            where: { userId_storyId: { userId: dbUser.id, storyId: id } },
          }),
        ]);
        initialLiked = !!like;
        initialBookmarked = !!bookmark;
      }
    }
  } catch {
    // Not logged in
  }

  const isOwner = currentUserId === story.authorId;

  // Community branch续写 tree (only meaningful for published stories with at
  // least one chapter). Branches live outside the canonical chapters.
  const showCoCreation = story.status === "PUBLISHED" && story.chapters.length > 0;
  const [branches, polls] = showCoCreation
    ? await Promise.all([
        getBranchTree(id, currentUserId),
        getPollsForStory(id, currentUserId),
      ])
    : [[], []];

  // Expressive reactions summary (催泪/带感/脑洞/甜).
  const reactions = await getReactionSummary(id, currentUserId);

  // Series-wide resume: the reader's last position, for the multi-chapter TOC.
  const resumeChapter = story.chapters.length > 1 ? await getStoryProgress(id) : null;

  // Published derivative works of this story (二创/衍生).
  const remixes = story.status === "PUBLISHED" ? await getRemixes(id) : [];
  const remixedFrom = story.remixedFrom
    ? {
        id: story.remixedFrom.id,
        title: story.remixedFrom.title,
        authorUsername: story.remixedFrom.author.username,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <StoryReader
        story={story}
        chapters={story.chapters}
        firstChapterContent={firstChapterContent}
        initialLikeCount={story._count.likes}
        initialLiked={initialLiked}
        initialBookmarked={initialBookmarked}
        commentCount={story._count.comments}
        currentUserId={currentUserId}
        isOwner={isOwner}
        remixedFrom={remixedFrom}
        reactions={reactions}
        resumeChapter={resumeChapter}
      />
      {showCoCreation && (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-10 space-y-6">
          <BranchPolls
            storyId={id}
            chapters={story.chapters}
            polls={polls}
            currentUserId={currentUserId}
            isOwner={isOwner}
            isLoggedIn={currentUserId !== null}
            allowBranching={story.allowBranching}
          />
          <BranchTree
            storyId={id}
            chapters={story.chapters}
            branches={branches}
            currentUserId={currentUserId}
            isOwner={isOwner}
            allowBranching={story.allowBranching}
            isLoggedIn={currentUserId !== null}
          />
        </div>
      )}
      {remixes.length > 0 && (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-10">
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
            <h2 className="flex items-center gap-2.5 font-display text-lg sm:text-xl text-foreground mb-4">
              <span className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
                <Copy className="size-4" />
              </span>
              衍生作品
              <span className="text-sm font-normal text-muted-foreground">
                被二创 {remixes.length} 次
              </span>
            </h2>
            <ul className="divide-y divide-border">
              {remixes.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/story/${r.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <span className="font-medium text-foreground truncate">{r.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {r.author.displayName || r.author.username}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <Suspense fallback={null}>
          <RelatedStories storyId={id} />
        </Suspense>
      </div>
    </div>
  );
}
