"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { MessageSquare, Coins } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StateBadge } from "@/components/state-badge";
import { cn } from "@/lib/utils";
import { DEMO_MODE, getMockProfile, MOCK_FUNDERS } from "@/lib/mockData";
import { BountyState } from "@/lib/contracts";
import type { BountyData } from "@/hooks/useBounties";

type BountyCardProps = {
  bounty: BountyData;
  className?: string;
  userAddress?: string;
  userJoinedBounties?: Set<string>;
  userClaimedBounties?: Set<string>;
};

const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const getIssuerDisplay = (addr: string) => {
  if (DEMO_MODE) {
    const profile = getMockProfile(addr);
    if (profile) {
      return {
        name: profile.displayName || profile.username,
        avatar: profile.pfpUrl,
      };
    }
  }
  return { name: formatAddress(addr), avatar: null };
};

const formatEth = (value: bigint) => {
  if (value === 0n) return "Ξ0";
  const num = Number(formatEther(value));
  if (num < 0.001) return "Ξ<0.001";
  return `Ξ${num.toLocaleString(undefined, { maximumFractionDigits: 3 })}`;
};

export function BountyCard({ bounty, className, userAddress, userJoinedBounties, userClaimedBounties }: BountyCardProps) {
  const title = bounty.metadata?.title || "Untitled Bounty";
  const description = bounty.metadata?.description || "";
  const truncatedDescription =
    description.length > 80 ? description.substring(0, 80) + "..." : description;

  // User relationship checks
  const isIssuer = userAddress && bounty.issuer.toLowerCase() === userAddress.toLowerCase();
  const hasJoined = userAddress && userJoinedBounties?.has(bounty.address.toLowerCase());
  const hasClaimed = userAddress && userClaimedBounties?.has(bounty.address.toLowerCase());
  const hasStake = isIssuer || hasJoined;

  // Determine action tags (can have multiple for Join + Claim)
  const getActionTags = () => {
    const tags: { label: string; color: string }[] = [];

    if (bounty.state === BountyState.VOTING && hasStake) {
      tags.push({ label: "Vote", color: "bg-amber-500/20 text-amber-300" });
      return tags;
    }
    if (bounty.state === BountyState.CANCELLED && hasStake) {
      tags.push({ label: "Withdraw", color: "bg-zinc-500/20 text-zinc-300" });
      return tags;
    }
    if (bounty.state === BountyState.OPEN && isIssuer && Number(bounty.claimsCount) > 0) {
      tags.push({ label: "Select", color: "bg-green-500/20 text-green-300" });
      return tags;
    }
    // Join and Claim can both show
    if (bounty.state === BountyState.OPEN && bounty.joinable && userAddress && !isIssuer && !hasJoined) {
      tags.push({ label: "Join", color: "bg-blue-500/20 text-blue-300" });
    }
    if (bounty.state === BountyState.OPEN && userAddress && !isIssuer && !hasClaimed) {
      tags.push({ label: "Claim", color: "bg-rose-500/20 text-rose-300" });
    }
    return tags;
  };

  const actionTags = getActionTags();

  return (
    <Link href={`/bounty/${bounty.address}`} className="block">
      <Card
        className={cn(
          "group overflow-hidden transition-colors hover:border-zinc-700",
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header with title and status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white group-hover:text-rose-400 transition-colors">
                {title}
              </h3>
              {truncatedDescription && (
                <p className="mt-1.5 line-clamp-2 text-xs text-zinc-400 leading-relaxed">
                  {truncatedDescription}
                </p>
              )}
            </div>
            <StateBadge state={bounty.state} size="sm" />
          </div>

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-4">
            {/* Bounty amount - highlighted */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                <Coins className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <span className="text-sm font-bold text-rose-400">
                {formatEth(bounty.totalStaked)}
              </span>
            </div>

            {/* Claims count */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {bounty.claimsCount.toString()}
                </span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                  Claims
                </span>
              </div>
            </div>

          </div>

          {/* Footer with funders */}
          <div className="mt-3 pt-3 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
              {(() => {
                const funders = DEMO_MODE ? (MOCK_FUNDERS[bounty.address] || []) : [];
                const displayFunders = funders.slice(0, 5);
                const remainingCount = funders.length - 5;

                if (funders.length === 0) {
                  // Fallback to just issuer
                  const issuer = getIssuerDisplay(bounty.issuer);
                  return (
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      {issuer.avatar && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={issuer.avatar} alt={issuer.name} />
                          <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-400">
                            {issuer.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className={cn("text-zinc-400", issuer.avatar ? "font-medium" : "font-mono")}>
                        {issuer.name}
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {displayFunders.map((funder, i) => {
                        const profile = DEMO_MODE ? getMockProfile(funder.address) : null;
                        const displayName = profile?.displayName || profile?.username || formatAddress(funder.address);
                        const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${funder.address.toLowerCase()}`;
                        const isCreator = funder.address.toLowerCase() === bounty.issuer.toLowerCase();

                        return (
                          <Avatar
                            key={funder.address}
                            className={cn(
                              "h-6 w-6 border-2 border-zinc-900",
                              isCreator && "ring-1 ring-rose-500"
                            )}
                            style={{ zIndex: displayFunders.length - i }}
                          >
                            <AvatarImage src={avatarUrl} alt={displayName} />
                            <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-400">
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                      {remainingCount > 0 && (
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border-2 border-zinc-900 text-[9px] font-semibold text-zinc-400"
                          style={{ zIndex: 0 }}
                        >
                          +{remainingCount}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-[10px] text-zinc-500">
                      {funders.length} {funders.length === 1 ? "funder" : "funders"}
                    </span>
                  </div>
                );
              })()}
              {actionTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {actionTags.map((tag) => (
                    <span
                      key={tag.label}
                      className={cn(
                        "inline-flex items-center rounded-full font-semibold uppercase tracking-wider px-2 py-0.5 text-[9px] animate-pulse",
                        tag.color
                      )}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
