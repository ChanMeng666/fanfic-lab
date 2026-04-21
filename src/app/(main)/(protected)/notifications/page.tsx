import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getNotifications } from "@/lib/actions/notification";
import { NotificationsList } from "./notifications-client";

export const metadata = {
  title: "通知",
};

export default async function NotificationsPage() {
  const items = await getNotifications({ limit: 100 });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
            <Bell className="size-5" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">通知</h1>
        </header>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mx-auto mb-4">
                <Bell className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                暂无通知
              </h3>
              <p className="text-muted-foreground">
                有人评论、点赞、关注你时，会出现在这里
              </p>
              <Link
                href="/feed"
                className="text-sm text-primary hover:underline mt-4 inline-block"
              >
                去逛逛 Feed
              </Link>
            </CardContent>
          </Card>
        ) : (
          <NotificationsList initialItems={items} />
        )}
      </main>
    </div>
  );
}
