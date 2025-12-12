"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserHeaderProps = {
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
};

const initialsFrom = (label?: string) => {
  if (!label) return "";
  const stripped = label.replace(/[^a-zA-Z0-9]/g, "");
  if (!stripped) return label.slice(0, 2).toUpperCase();
  return stripped.slice(0, 2).toUpperCase();
};

export function UserHeader({ displayName, username, avatarUrl }: UserHeaderProps) {
  const name = displayName || username;

  if (!name) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 border border-zinc-800">
      <Avatar className="h-6 w-6">
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className="bg-zinc-800 text-white text-xs">
          {initialsFrom(name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-zinc-300 max-w-[100px] truncate">
        {username || displayName}
      </span>
    </div>
  );
}
