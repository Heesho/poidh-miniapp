"use client";

import Link from "next/link";
import {
  Target,
  Coins,
  Camera,
  Vote,
  Trophy,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { type ActivityItem } from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}

type ActivityFeedItemProps = {
  activity: ActivityItem;
  bountyTitle?: string;
};

export function ActivityFeedItem({ activity, bountyTitle }: ActivityFeedItemProps) {
  const { type, timestamp, bountyAddress, data } = activity;

  const displayTitle = bountyTitle || truncateAddress(bountyAddress);

  const config: {
    icon: typeof Target;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    message: React.ReactNode;
    highlight?: boolean;
  } = (() => {
    switch (type) {
      case "bounty_created":
        return {
          icon: Target,
          iconColor: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/20",
          message: (
            <>
              <span className="font-semibold text-text-primary">
                {truncateAddress(data.user!)}
              </span>{" "}
              <span className="text-text-tertiary">created</span>{" "}
              <span className="font-medium text-primary">{displayTitle}</span>
            </>
          ),
          highlight: true,
        };
      case "bounty_joined":
        return {
          icon: Coins,
          iconColor: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
          message: (
            <>
              <span className="font-semibold text-text-primary">
                {truncateAddress(data.user!)}
              </span>{" "}
              <span className="text-text-tertiary">added</span>{" "}
              <span className="font-bold text-success">{data.amount} ETH</span>
            </>
          ),
        };
      case "claim_submitted":
        return {
          icon: Camera,
          iconColor: "text-accent-blue",
          bgColor: "bg-accent-blue/10",
          borderColor: "border-accent-blue/20",
          message: (
            <>
              <span className="font-semibold text-text-primary">
                {truncateAddress(data.claimant!)}
              </span>{" "}
              <span className="text-text-tertiary">submitted proof</span>
              {data.claimName && (
                <span className="block mt-0.5 text-text-secondary text-[11px] truncate">
                  &ldquo;{data.claimName.slice(0, 40)}
                  {data.claimName.length > 40 ? "..." : ""}&rdquo;
                </span>
              )}
            </>
          ),
        };
      case "vote_started":
        return {
          icon: Vote,
          iconColor: "text-accent-purple",
          bgColor: "bg-accent-purple/10",
          borderColor: "border-accent-purple/20",
          message: (
            <span className="text-text-tertiary">
              Voting started on <span className="font-medium text-text-secondary">{displayTitle}</span>
            </span>
          ),
        };
      case "vote_cast":
        return {
          icon: Vote,
          iconColor: "text-accent-purple",
          bgColor: "bg-accent-purple/10",
          borderColor: "border-accent-purple/20",
          message: (
            <>
              <span className="font-semibold text-text-primary">
                {truncateAddress(data.user!)}
              </span>{" "}
              <span className="text-text-tertiary">voted</span>{" "}
              <span className={cn(
                "font-semibold",
                data.support ? "text-success" : "text-danger"
              )}>
                {data.support ? "Yes" : "No"}
              </span>
            </>
          ),
        };
      case "bounty_paid":
        return {
          icon: Trophy,
          iconColor: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
          message: (
            <>
              <span className="font-semibold text-text-primary">
                {truncateAddress(data.winner!)}
              </span>{" "}
              <span className="text-text-tertiary">won</span>{" "}
              <span className="font-bold text-warning">{data.reward} ETH</span>
            </>
          ),
          highlight: true,
        };
      case "bounty_cancelled":
        return {
          icon: XCircle,
          iconColor: "text-danger",
          bgColor: "bg-danger/10",
          borderColor: "border-danger/20",
          message: (
            <span className="text-text-tertiary">
              <span className="font-medium text-text-secondary">{displayTitle}</span> was cancelled
            </span>
          ),
        };
      default:
        return {
          icon: Target,
          iconColor: "text-text-tertiary",
          bgColor: "bg-surface-hover",
          borderColor: "border-surface-border",
          message: <span className="text-text-tertiary">Unknown activity</span>,
        };
    }
  })();

  const Icon = config.icon;

  return (
    <Link
      href={`/bounty/${bountyAddress}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
        "bg-surface/30 hover:bg-surface-hover",
        config.borderColor,
        config.highlight && "shadow-sm"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          config.bgColor
        )}
      >
        <Icon className={cn("h-4 w-4", config.iconColor)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed">{config.message}</p>
      </div>

      {/* Timestamp and arrow */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-[10px] font-medium text-text-muted">
          {timeAgo(timestamp)}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
    </Link>
  );
}
