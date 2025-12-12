"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import Link from "next/link";
import { Trophy, Coins, Gift, Target, Users, Vote, Send, Camera, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { base } from "wagmi/chains";
import { formatEther } from "viem";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { UserHeader } from "@/components/user-header";
import { useBounties } from "@/hooks/useBounties";
import { useActivityFeed, type ActivityItem, type ActivityType } from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";
import { DEMO_MODE, getMockProfile } from "@/lib/mockData";

type MiniAppContext = {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
};

const initialsFrom = (label?: string) => {
  if (!label) return "";
  const stripped = label.replace(/[^a-zA-Z0-9]/g, "");
  if (!stripped) return label.slice(0, 2).toUpperCase();
  return stripped.slice(0, 2).toUpperCase();
};

const formatEth = (value: bigint) => {
  if (value === 0n) return "Ξ0";
  const num = Number(formatEther(value));
  if (num < 0.001) return "Ξ<0.001";
  return `Ξ${num.toLocaleString(undefined, { maximumFractionDigits: 3 })}`;
};

const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const timeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const activityConfig: Record<ActivityType, { icon: typeof Trophy; color: string; bgColor: string; label: string }> = {
  bounty_created: { icon: Target, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Created a bounty" },
  bounty_joined: { icon: Coins, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Joined bounty" },
  claim_submitted: { icon: Camera, color: "text-rose-400", bgColor: "bg-rose-500/10", label: "Submitted proof" },
  vote_started: { icon: Vote, color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Voting started" },
  vote_cast: { icon: Vote, color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Voted" },
  bounty_paid: { icon: Trophy, color: "text-amber-400", bgColor: "bg-amber-500/10", label: "Won bounty" },
  bounty_cancelled: { icon: XCircle, color: "text-zinc-400", bgColor: "bg-zinc-500/10", label: "Cancelled" },
};

const getUserDisplay = (addr: string | undefined): { name: string; avatar: string | null } => {
  if (!addr) return { name: "Someone", avatar: null };

  if (DEMO_MODE) {
    const profile = getMockProfile(addr);
    if (profile) {
      return { name: profile.displayName || profile.username, avatar: profile.pfpUrl };
    }
  }

  return { name: formatAddress(addr), avatar: null };
};

const getActivityAction = (activity: ActivityItem): string => {
  switch (activity.type) {
    case "bounty_created":
      return "Created a bounty";
    case "bounty_joined":
      return `Joined with Ξ${activity.data.amount}`;
    case "claim_submitted":
      return activity.data.claimName ? `"${activity.data.claimName.slice(0, 30)}${activity.data.claimName.length > 30 ? '...' : ''}"` : "Submitted proof";
    case "vote_started":
      return "Voting started";
    case "vote_cast":
      return activity.data.support ? "Voted yes" : "Voted no";
    case "bounty_paid":
      return `Won Ξ${activity.data.reward}`;
    case "bounty_cancelled":
      return "Bounty cancelled";
    default:
      return "Activity";
  }
};

const getActivityUser = (activity: ActivityItem) => {
  const addr = activity.data.user || activity.data.claimant || activity.data.winner;
  return getUserDisplay(addr);
};

export default function Home() {
  const readyRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);

  // Farcaster context
  useEffect(() => {
    let cancelled = false;
    const hydrateContext = async () => {
      try {
        const ctx = (await (
          sdk as unknown as {
            context: Promise<MiniAppContext> | MiniAppContext;
          }
        ).context) as MiniAppContext;
        if (!cancelled) {
          setContext(ctx);
        }
      } catch {
        if (!cancelled) setContext(null);
      }
    };
    hydrateContext();
    return () => {
      cancelled = true;
    };
  }, []);

  // Signal ready to Farcaster
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        readyRef.current = true;
        sdk.actions.ready().catch(() => {});
      }
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  // Wallet connection
  const { isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const primaryConnector = connectors[0];

  useEffect(() => {
    if (
      autoConnectAttempted.current ||
      isConnected ||
      !primaryConnector ||
      isConnecting
    ) {
      return;
    }
    autoConnectAttempted.current = true;
    connectAsync({
      connector: primaryConnector,
      chainId: base.id,
    }).catch(() => {});
  }, [connectAsync, isConnected, isConnecting, primaryConnector]);

  // Fetch bounties for stats
  const { bounties, totalCount } = useBounties(100, 0);

  // Create a map of bounty address to title
  const bountyTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    bounties.forEach(b => {
      map.set(b.address.toLowerCase(), b.metadata?.title || "Untitled");
    });
    return map;
  }, [bounties]);

  // Fetch activity feed
  const { activities, isLoading: isLoadingActivity } = useActivityFeed(30);

  // Track seen activity IDs to animate new ones
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Update seen IDs when activities change
  useEffect(() => {
    if (activities.length === 0) return;

    if (isInitialLoad.current) {
      // On initial load, mark all as seen (no animation)
      setSeenIds(new Set(activities.map(a => a.id)));
      isInitialLoad.current = false;
    } else {
      // Find new activities
      const currentIds = new Set(activities.map(a => a.id));
      const newActivityIds = new Set<string>();

      activities.forEach(a => {
        if (!seenIds.has(a.id)) {
          newActivityIds.add(a.id);
        }
      });

      if (newActivityIds.size > 0) {
        setNewIds(newActivityIds);
        setSeenIds(currentIds);

        // Clear new status after animation completes
        setTimeout(() => {
          setNewIds(new Set());
        }, 2500);
      }
    }
  }, [activities, seenIds]);

  // Calculate stats
  const totalStaked = bounties.reduce((sum, b) => sum + b.totalStaked, 0n);
  const openBounties = bounties.filter(b => b.state === 0).length;

  // Estimate rewards paid (closed bounties total)
  const rewardsPaid = bounties
    .filter(b => b.state === 2)
    .reduce((sum, b) => sum + b.totalStaked, 0n);

  const userDisplayName =
    context?.user?.displayName ?? context?.user?.username ?? "Farcaster user";
  const userAvatarUrl = context?.user?.pfpUrl ?? null;

  return (
    <main className="fixed inset-0 flex justify-center bg-black">
      <div
        className="relative flex h-full w-full max-w-[520px] flex-col"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
        }}
      >
        {/* Fixed Header */}
        <header className="shrink-0 flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/25">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                POIDH
              </h1>
              <p className="text-[11px] text-zinc-400">
                Pics Or It Didn&apos;t Happen
              </p>
            </div>
          </div>
          {context?.user && (
            <UserHeader
              displayName={context.user.displayName}
              username={context.user.username}
              avatarUrl={context.user.pfpUrl}
            />
          )}
        </header>

        {/* Stats Grid - Fixed */}
        <div className="shrink-0 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Gift className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Paid</p>
                    <p className="text-sm font-bold text-white">{formatEth(rewardsPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Available</p>
                    <p className="text-sm font-bold text-white">{formatEth(totalStaked)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total Bounties</p>
                    <p className="text-sm font-bold text-white">{totalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <Trophy className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Open Bounties</p>
                    <p className="text-sm font-bold text-white">{openBounties}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Feed Header - Fixed */}
        <div className="shrink-0 px-4 pb-2">
          <h2 className="text-sm font-semibold text-white">Activity Feed</h2>
        </div>

        {/* Activity Feed - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 scrollbar-hide">
          {isLoadingActivity ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
              <p className="mt-2 text-xs text-zinc-500">Loading activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900">
                <Trophy className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="mt-3 text-sm text-zinc-400">No activity yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Activity will appear here as bounties are created and completed
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-4">
              {activities.map((activity) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;
                const user = getActivityUser(activity);
                const bountyTitle = bountyTitleMap.get(activity.bountyAddress.toLowerCase()) || "Bounty";
                const truncatedTitle = bountyTitle.length > 25 ? bountyTitle.slice(0, 25) + "..." : bountyTitle;

                return (
                  <Link
                    key={activity.id}
                    href={`/bounty/${activity.bountyAddress}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-3 transition-colors hover:bg-zinc-900 hover:border-zinc-700",
                      newIds.has(activity.id) && "animate-new-item"
                    )}
                  >
                    {/* Activity Icon */}
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-500 truncate">{truncatedTitle}</p>
                      <p className="text-xs font-medium text-white leading-relaxed mt-0.5">
                        {getActivityAction(activity)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {user.avatar ? (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-[6px] bg-zinc-800 text-zinc-400">
                              {initialsFrom(user.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-zinc-800" />
                        )}
                        <span className="text-[11px] text-zinc-500">{user.name}</span>
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <NavBar />
    </main>
  );
}
