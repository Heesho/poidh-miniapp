"use client";

import { ExternalLink, Check, X, Trophy, Play, Image as ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getIPFSUrl } from "@/lib/ipfs";
import { DEMO_MODE, getMockProfile } from "@/lib/mockData";
import type { ClaimData } from "@/hooks/useClaims";

type ClaimCardProps = {
  claim: ClaimData;
  isVoting?: boolean;
  isWinningClaim?: boolean;
  canVote?: boolean;
  canStartVote?: boolean;
  onVote?: (support: boolean) => void;
  onStartVote?: () => void;
  isVoteLoading?: boolean;
  className?: string;
};

const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export function ClaimCard({
  claim,
  isVoting = false,
  isWinningClaim = false,
  canVote = false,
  canStartVote = false,
  onVote,
  onStartVote,
  isVoteLoading = false,
  className,
}: ClaimCardProps) {
  // In demo mode, use mock profiles; otherwise fetch from Neynar
  const mockProfile = DEMO_MODE ? getMockProfile(claim.claimant) : null;

  const { data: neynarUser } = useQuery<{
    user: {
      fid: number | null;
      username: string | null;
      displayName: string | null;
      pfpUrl: string | null;
    } | null;
  }>({
    queryKey: ["neynar-user", claim.claimant],
    queryFn: async () => {
      const res = await fetch(
        `/api/neynar/user?address=${encodeURIComponent(claim.claimant)}`
      );
      if (!res.ok) return { user: null };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
    enabled: !DEMO_MODE, // Skip API call in demo mode
  });

  const displayName = mockProfile
    ? mockProfile.displayName || mockProfile.username
    : neynarUser?.user?.displayName ||
      neynarUser?.user?.username ||
      formatAddress(claim.claimant);
  const avatarUrl = mockProfile
    ? mockProfile.pfpUrl
    : neynarUser?.user?.pfpUrl ||
      `https://api.dicebear.com/7.x/shapes/svg?seed=${claim.claimant.toLowerCase()}`;

  // Get proof URL
  const proofUrl = claim.proofURI ? getIPFSUrl(claim.proofURI) : null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        isWinningClaim && "border-green-500/50 bg-green-500/5",
        isVoting && "border-amber-500/50 bg-amber-500/5",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Claimant Avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-zinc-800 text-white text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">
                    {claim.name}
                  </span>
                  {isWinningClaim && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                      <Trophy className="h-3 w-3" />
                      WINNER
                    </span>
                  )}
                  {isVoting && !isWinningClaim && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
                      VOTING
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400">
                  by <span className="font-medium text-zinc-300">{displayName}</span>
                </div>
              </div>

              {/* Proof Link */}
              {proofUrl && (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Proof
                </a>
              )}
            </div>

            {/* Proof Description */}
            {claim.proof?.description && (
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed line-clamp-3 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                {claim.proof.description}
              </p>
            )}

            {/* Proof Image */}
            {claim.proof?.imageUrl && (
              <div className="mt-3 relative group">
                <img
                  src={getIPFSUrl(claim.proof.imageUrl)}
                  alt="Proof"
                  className="w-full max-h-40 rounded-xl border border-zinc-800 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end justify-center pb-2">
                  <span className="flex items-center gap-1 text-[10px] text-white/80 font-medium">
                    <ImageIcon className="h-3 w-3" />
                    Proof Image
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            {(isVoting && canVote) || canStartVote ? (
              <div className="mt-4 pt-3 border-t border-zinc-800/50">
                {isVoting && canVote && onVote && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => onVote(true)}
                      disabled={isVoteLoading}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-9"
                      onClick={() => onVote(false)}
                      disabled={isVoteLoading}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
                {canStartVote && onStartVote && (
                  <Button
                    size="sm"
                    className="w-full h-9 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white"
                    onClick={onStartVote}
                    disabled={isVoteLoading}
                  >
                    <Play className="h-4 w-4" />
                    Start Voting
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
