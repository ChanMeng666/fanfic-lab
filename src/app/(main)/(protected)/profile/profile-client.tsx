"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Heart,
  MessageSquare,
  Users,
  FileText,
  Trash2,
  Edit,
  BarChart3,
  PenLine,
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
import { updateProfile } from "@/lib/actions/user";
import { deleteStory } from "@/lib/actions/story";
import { deleteDraft } from "@/lib/actions/user";
import { toast } from "sonner";

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
  wordCount: number;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    likes: number;
    comments: number;
    chapters: number;
  };
}

interface Draft {
  id: string;
  title: string | null;
  content: string;
  fandom: string | null;
  ships: string[];
  updatedAt: string;
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
  drafts: Draft[];
  likedStories: Story[];
  stats: UserStats;
}

export function ProfileClient({
  profile: initialProfile,
  stories: initialStories,
  drafts: initialDrafts,
  likedStories,
  stats,
}: ProfileClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState(initialProfile);
  const [stories, setStories] = useState(initialStories);
  const [drafts, setDrafts] = useState(initialDrafts);

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && ["stories", "drafts", "liked"].includes(tabParam)
      ? tabParam
      : "stories";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile.displayName || "",
    bio: profile.bio || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editForm.displayName || undefined,
        bio: editForm.bio || undefined,
      });
      setProfile((prev) => ({
        ...prev,
        displayName: editForm.displayName,
        bio: editForm.bio,
      }));
      setIsEditingProfile(false);
      toast.success("资料更新成功");
    } catch {
      toast.error("更新资料失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("确定删除这篇故事吗？此操作无法撤销。")) return;
    try {
      await deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success("故事已删除");
    } catch {
      toast.error("删除故事失败");
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await deleteDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      toast.success("草稿已删除");
    } catch {
      toast.error("删除草稿失败");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-secondary">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.displayName?.[0] ||
                        profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <Dialog
                    open={isEditingProfile}
                    onOpenChange={setIsEditingProfile}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                      >
                        <Edit className="size-3.5" />
                        编辑资料
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">
                          编辑资料
                        </DialogTitle>
                        <DialogDescription>
                          修改你的昵称和个人简介
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            昵称
                          </label>
                          <Input
                            value={editForm.displayName}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                displayName: e.target.value,
                              })
                            }
                            placeholder="输入你的昵称"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            个人简介
                          </label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                bio: e.target.value,
                              })
                            }
                            placeholder="介绍一下自己吧..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                        >
                          {isSaving ? "保存中..." : "保存"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Social stats */}
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

            {/* Stats Card */}
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
                  <span className="font-medium text-foreground">
                    {stats.totalLikes}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">评论</span>
                  <span className="font-medium text-foreground">
                    {stats.totalComments}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Favorite Fandoms */}
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
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="stories" className="gap-1.5">
                  <BookOpen className="size-4" />
                  作品 ({stories.length})
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-1.5">
                  <FileText className="size-4" />
                  草稿 ({drafts.length})
                </TabsTrigger>
                <TabsTrigger value="liked" className="gap-1.5">
                  <Heart className="size-4" />
                  收藏
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stories" className="mt-6">
                {stories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <BookOpen className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有作品
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        你还没有创作过故事，开始你的创作之旅吧
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
                    {stories.map((story) => (
                      <Card key={story.id} variant="story">
                        <div className="flex">
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/story/${story.id}`}>
                                  <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                                    {story.title}
                                  </h3>
                                </Link>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {story.fandom}
                                  </Badge>
                                  <Badge
                                    variant={
                                      story.status === "PUBLISHED"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {story.status === "PUBLISHED"
                                      ? "已发布"
                                      : story.status === "DRAFT"
                                        ? "草稿"
                                        : story.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/story/${story.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                  >
                                    <BookOpen className="size-3.5" />
                                    查看
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                  onClick={() => handleDeleteStory(story.id)}
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
                              <span>
                                {story.wordCount.toLocaleString()} 字
                              </span>
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
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drafts" className="mt-6">
                {drafts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <FileText className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        暂无草稿
                      </h3>
                      <p className="text-muted-foreground">
                        还没有保存的草稿
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft) => (
                      <Card key={draft.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {draft.title || "未命名草稿"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              {draft.fandom && (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {draft.fandom}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                更新于{" "}
                                {new Date(
                                  draft.updatedAt
                                ).toLocaleDateString("zh-CN")}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => router.push("/create")}
                            >
                              <Edit className="size-3.5" />
                              继续创作
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteDraft(draft.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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
                        还没有收藏的故事
                      </h3>
                      <p className="text-muted-foreground">
                        浏览故事并点击收藏，你喜欢的故事会出现在这里
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {likedStories.map((story) => (
                      <Card key={story.id} variant="story">
                        <div className="p-4">
                          <Link href={`/story/${story.id}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {story.title}
                            </h3>
                          </Link>
                          {story.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {story.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {story.fandom}
                            </Badge>
                            {story.ships.slice(0, 2).map((ship) => (
                              <Badge
                                key={ship}
                                variant="secondary"
                                className="text-xs"
                              >
                                {ship}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="size-3" />
                              {story._count.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="size-3" />
                              {story._count.comments}
                            </span>
                            <span>
                              {story.wordCount.toLocaleString()} 字
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
