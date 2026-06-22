"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Heart,
  Bookmark,
  MessageSquare,
  FileText,
  Trash2,
  Edit,
  BarChart3,
  PenLine,
  Camera,
  X,
  Plus,
  Pencil,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StoryCard, type StoryCardData } from "@/components/feed";
import { updateProfile, updatePreferences } from "@/lib/actions/user";
import { deleteStory, publishStory } from "@/lib/actions/story";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { AvatarCropDialog } from "@/components/avatar/AvatarCropDialog";

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  preferences: {
    favoriteFandoms: string[];
    favoriteShips: string[];
    darkMode: boolean;
  } | null;
  _count: {
    stories: number;
    followers: number;
    follows: number;
  };
}

interface Story {
  id: string;
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
  rating: string;
  status: string;
  isComplete: boolean;
  wordCount: number;
  viewCount?: number;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  _count: {
    likes: number;
    comments: number;
    chapters: number;
  };
}

interface UserStats {
  totalStories: number;
  publishedStories: number;
  totalWords: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
}

interface ProfileClientProps {
  profile: UserProfile;
  stories: Story[];
  likedStories: Story[];
  bookmarkedStories: Story[];
  stats: UserStats;
}

const KNOWN_FANDOMS = [
  "Honkai: Star Rail",
  "Genshin Impact",
  "Honkai Impact 3rd",
  "Zenless Zone Zero",
  "Arknights",
  "Fate Series",
];

function toCardData(story: Story, fallbackAuthor: { id: string; username: string; avatarUrl: string | null }): StoryCardData {
  const author = story.author ?? fallbackAuthor;
  // Completion drives the COMPLETE badge; otherwise fall back to visibility.
  const status: "DRAFT" | "PUBLISHED" | "COMPLETE" = story.isComplete
    ? "COMPLETE"
    : story.status === "DRAFT"
      ? "DRAFT"
      : "PUBLISHED";
  const rating = (["GENERAL", "TEEN", "MATURE", "EXPLICIT"] as const).includes(story.rating as never)
    ? (story.rating as "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT")
    : "GENERAL";
  return {
    id: story.id,
    title: story.title,
    summary: story.summary ?? "",
    fandom: story.fandom,
    ships: story.ships,
    tags: story.tags,
    rating,
    status,
    wordCount: story.wordCount,
    chapterCount: story._count.chapters,
    likes: story._count.likes,
    comments: story._count.comments,
    views: story.viewCount ?? 0,
    coverUrl: story.coverImageUrl ?? undefined,
    author: {
      id: author.id,
      username: author.username,
      avatarUrl: author.avatarUrl ?? undefined,
    },
    updatedAt: story.updatedAt,
  };
}

export function ProfileClient({
  profile: initialProfile,
  stories: initialStories,
  likedStories,
  bookmarkedStories,
  stats,
}: ProfileClientProps) {
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState(initialProfile);
  const [stories, setStories] = useState(initialStories);

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && ["stories", "drafts", "liked", "bookmarked"].includes(tabParam)
      ? tabParam
      : "stories";
  const [activeTab, setActiveTab] = useState(initialTab);

  const publishedStories = stories.filter((s) => s.status !== "DRAFT");
  const draftStories = stories.filter((s) => s.status === "DRAFT");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile.displayName || "",
    bio: profile.bio || "",
  });
  const [favoriteFandoms, setFavoriteFandoms] = useState<string[]>(
    profile.preferences?.favoriteFandoms ?? []
  );
  const [newFandom, setNewFandom] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fallbackAuthor = {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
  };

  function addFandom(value: string) {
    const v = value.trim();
    if (!v) return;
    if (favoriteFandoms.includes(v)) return;
    setFavoriteFandoms((prev) => [...prev, v]);
    setNewFandom("");
  }

  function removeFandom(value: string) {
    setFavoriteFandoms((prev) => prev.filter((f) => f !== value));
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      await Promise.all([
        updateProfile({
          displayName: editForm.displayName || undefined,
          bio: editForm.bio || undefined,
        }),
        updatePreferences({ favoriteFandoms }),
      ]);
      setProfile((prev) => ({
        ...prev,
        displayName: editForm.displayName,
        bio: editForm.bio,
        preferences: {
          favoriteFandoms,
          favoriteShips: prev.preferences?.favoriteShips ?? [],
          darkMode: prev.preferences?.darkMode ?? false,
        },
      }));
      setIsEditingProfile(false);
      toast.success("资料更新成功");
    } catch (err) {
      toast.error(formatError(err, "更新资料失败"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleFileSelect(file: File) {
    setPendingAvatarFile(file);
    setCropDialogOpen(true);
  }

  async function handleAvatarUpload(blob: Blob) {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      // The cropper always emits a square JPEG; give it a stable filename
      // so the server's MIME validation (image/jpeg|png|webp) accepts it.
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "上传失败");
      }
      const data = await res.json();
      setProfile((prev) => ({ ...prev, avatarUrl: data.url }));
      toast.success("头像已更新");
    } catch (err) {
      toast.error(formatError(err, "头像上传失败"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteStory(pendingDeleteId);
      setStories((prev) => prev.filter((s) => s.id !== pendingDeleteId));
      toast.success("故事已删除");
      setPendingDeleteId(null);
    } catch (err) {
      toast.error(formatError(err, "删除故事失败"));
    } finally {
      setDeleting(false);
    }
  }

  async function handlePublishDraft(storyId: string) {
    try {
      await publishStory(storyId);
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? { ...s, status: "PUBLISHED", publishedAt: new Date().toISOString() }
            : s
        )
      );
      toast.success("已发布");
    } catch (err) {
      toast.error(formatError(err, "发布失败"));
    }
  }

  function renderStoryRow(story: Story, opts?: { isDraft?: boolean }) {
    return (
      <Card key={story.id} variant="story" className="overflow-hidden">
        <Link
          href={`/story/${story.id}`}
          aria-label={story.title}
          className="absolute inset-0 z-10"
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground line-clamp-1">{story.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {story.fandom}
                </Badge>
                <Badge
                  variant={story.status === "PUBLISHED" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {story.status === "PUBLISHED"
                    ? "已发布"
                    : story.status === "ARCHIVED"
                      ? "已归档"
                      : story.status === "DRAFT"
                        ? "草稿"
                        : story.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-xs ${story.isComplete ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}
                >
                  {story.isComplete ? "已完结" : "连载中"}
                </Badge>
              </div>
            </div>
            <div className="relative z-20 flex items-center gap-1">
              {opts?.isDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePublishDraft(story.id);
                  }}
                  aria-label="发布草稿"
                >
                  <Send className="size-3.5" />
                </Button>
              )}
              <Link
                href={`/story/${story.id}/edit`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  aria-label="编辑故事"
                >
                  <Pencil className="size-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPendingDeleteId(story.id);
                }}
                aria-label="删除故事"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          {story.summary && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {story.summary}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" />
              {story._count.chapters} 章
            </span>
            <span>{story.wordCount.toLocaleString()} 字</span>
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" />
              {story._count.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {story._count.comments}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-secondary">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                        <Edit className="size-3.5" />
                        编辑资料
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-display">编辑资料</DialogTitle>
                        <DialogDescription>
                          修改你的头像、昵称、简介与偏好
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        {/* Avatar */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">头像</label>
                          <div className="flex items-center gap-4">
                            <Avatar className="size-16 ring-2 ring-border">
                              <AvatarImage src={profile.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1.5">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileSelect(f);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={uploadingAvatar}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Camera className="size-3.5" />
                                {uploadingAvatar ? "上传中…" : "更换头像"}
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                JPG / PNG / WebP，≤ 5MB
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Name */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">昵称</label>
                          <Input
                            value={editForm.displayName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, displayName: e.target.value })
                            }
                            placeholder="输入你的昵称"
                          />
                        </div>
                        {/* Bio */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">个人简介</label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder="介绍一下自己吧..."
                            rows={3}
                          />
                        </div>
                        {/* Favorite Fandoms */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            喜欢的作品
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {favoriteFandoms.map((f) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="gap-1 pr-1"
                              >
                                {f}
                                <button
                                  type="button"
                                  onClick={() => removeFandom(f)}
                                  aria-label={`移除 ${f}`}
                                  className="rounded-full hover:bg-background/40 p-0.5"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                            {favoriteFandoms.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                暂未选择，可从下方常见作品中挑选或自行输入
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              value={newFandom}
                              onChange={(e) => setNewFandom(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addFandom(newFandom);
                                }
                              }}
                              placeholder="输入作品名后按回车"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addFandom(newFandom)}
                              className="gap-1"
                            >
                              <Plus className="size-3.5" />
                              添加
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {KNOWN_FANDOMS.filter((f) => !favoriteFandoms.includes(f)).map(
                              (f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => addFandom(f)}
                                  className="text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
                                >
                                  + {f}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                          取消
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          {isSaving ? "保存中..." : "保存"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.stories}
                    </div>
                    <div className="text-xs text-muted-foreground">作品</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.followers}
                    </div>
                    <div className="text-xs text-muted-foreground">粉丝</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.follows}
                    </div>
                    <div className="text-xs text-muted-foreground">关注</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex items-center justify-center size-8 rounded-xl bg-secondary text-secondary-foreground">
                    <BarChart3 className="size-4" />
                  </div>
                  创作统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">总字数</span>
                  <span className="font-medium text-foreground">
                    {stats.totalWords.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">已发布</span>
                  <span className="font-medium text-foreground">
                    {stats.publishedStories}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">获赞</span>
                  <span className="font-medium text-foreground">{stats.totalLikes}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">评论</span>
                  <span className="font-medium text-foreground">
                    {stats.totalComments}
                  </span>
                </div>
              </CardContent>
            </Card>

            {profile.preferences?.favoriteFandoms &&
              profile.preferences.favoriteFandoms.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="flex items-center justify-center size-8 rounded-xl bg-accent/15 text-accent">
                        <Heart className="size-4" />
                      </div>
                      喜欢的作品
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferences.favoriteFandoms.map((fandom) => (
                        <Badge key={fandom} variant="secondary">
                          {fandom}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Main Content */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 max-w-xl">
                <TabsTrigger value="stories" className="gap-1.5">
                  <BookOpen className="size-4" />
                  作品 ({publishedStories.length})
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-1.5">
                  <FileText className="size-4" />
                  草稿 ({draftStories.length})
                </TabsTrigger>
                <TabsTrigger value="liked" className="gap-1.5">
                  <Heart className="size-4" />
                  点赞 ({likedStories.length})
                </TabsTrigger>
                <TabsTrigger value="bookmarked" className="gap-1.5">
                  <Bookmark className="size-4" />
                  收藏 ({bookmarkedStories.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stories" className="mt-6">
                {publishedStories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <BookOpen className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有发布的作品
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        创作一篇新故事，或者把草稿发布出来
                      </p>
                      <Link href="/create">
                        <Button className="gap-2">
                          <PenLine className="size-4" />
                          开始创作
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {publishedStories.map((story) => renderStoryRow(story))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drafts" className="mt-6">
                {draftStories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mx-auto mb-4">
                        <FileText className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        没有草稿
                      </h3>
                      <p className="text-muted-foreground">
                        在创作页或编辑页把故事「存为草稿」，它会出现在这里
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      草稿不会出现在 Feed 或公开主页。点击 <Send className="inline size-3" /> 即可发布。
                    </p>
                    <div className="space-y-4">
                      {draftStories.map((story) => renderStoryRow(story, { isDraft: true }))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="liked" className="mt-6">
                {likedStories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-accent/10 mx-auto mb-4">
                        <Heart className="size-8 text-accent" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有点赞过的故事
                      </h3>
                      <p className="text-muted-foreground">
                        浏览故事并点个赞，你赞过的故事会出现在这里
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {likedStories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={toCardData(story, fallbackAuthor)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookmarked" className="mt-6">
                {bookmarkedStories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 mx-auto mb-4">
                        <Bookmark className="size-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有收藏的故事
                      </h3>
                      <p className="text-muted-foreground">
                        在阅读页点击「收藏」，把想稍后再读的故事存到这里
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {bookmarkedStories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={toCardData(story, fallbackAuthor)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              这篇故事将被永久删除，且无法恢复。确定继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvatarCropDialog
        file={pendingAvatarFile}
        open={cropDialogOpen}
        onOpenChange={(open) => {
          setCropDialogOpen(open);
          if (!open) {
            setPendingAvatarFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
        onConfirm={handleAvatarUpload}
      />
    </div>
  );
}
