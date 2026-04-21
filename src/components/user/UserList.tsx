import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserListItem {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface UserListProps {
  users: UserListItem[];
  emptyText: string;
}

export function UserList({ users, emptyText }: UserListProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
      {users.map((u) => (
        <li key={u.id}>
          <Link
            href={`/users/${u.username}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={u.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs bg-secondary">
                {u.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {u.displayName || u.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
