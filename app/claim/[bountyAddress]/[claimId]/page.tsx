"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Timer,
  Trophy,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatEther, type Address } from "viem";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Keep for voting card
import { NavBar } from "@/components/nav-bar";
import { UserHeader } from "@/components/user-header";
import { useBounty, useUserStake, useHasVoted } from "@/hooks/useBounties";
import { useClaims, useVoteState } from "@/hooks/useClaims";
import { BountyState, POIDH_ABI } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { DEMO_MODE, DEMO_USER_ADDRESS, getMockProfile, MOCK_CLAIMS } from "@/lib/mockData";

type MiniAppContext = {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
};

const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ bountyAddress: string; claimId: string }>;
}) {
  const { bountyAddress, claimId: claimIdStr } = use(params);
  const claimId = parseInt(claimIdStr, 10);
  const readyRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const { address: walletAddress, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const primaryConnector = connectors[0];

  // Use demo user address in demo mode
  const address = DEMO_MODE ? DEMO_USER_ADDRESS : walletAddress;

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

  // Fetch bounty and claims data
  const { bounty, isLoading: isLoadingBounty } = useBounty(bountyAddress as Address);
  const { claims, isLoading: isLoadingClaims } = useClaims(bountyAddress as Address);
  const { voteState, refetch: refetchVote } = useVoteState(bountyAddress as Address);
  const { data: userStake } = useUserStake(bountyAddress as Address, address);
  const { data: hasVoted } = useHasVoted(
    bountyAddress as Address,
    address,
    voteState?.votingRound
  );

  // Find the specific claim
  const claim = claims.find((c) => c.id === claimId);

  // Get claimant profile
  const claimantProfile = DEMO_MODE && claim ? getMockProfile(claim.claimant) : null;
  const claimantDisplayName = claimantProfile?.displayName || claimantProfile?.username || (claim ? formatAddress(claim.claimant) : "");
  const claimantAvatarUrl = claimantProfile?.pfpUrl || (claim ? `https://api.dicebear.com/7.x/shapes/svg?seed=${claim.claimant.toLowerCase()}` : "");

  // Contract interactions
  const {
    data: txHash,
    writeContract,
    isPending: isWriting,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  // Handle transaction success
  useEffect(() => {
    if (receipt?.status === "success") {
      setError(null);
      resetWrite();
      refetchVote();
    }
  }, [receipt, refetchVote, resetWrite]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
      resetWrite();
    }
  }, [writeError, resetWrite]);

  // Actions
  const handleStartVote = async () => {
    setError(null);
    try {
      let targetAddress = address;
      if (!targetAddress) {
        if (!primaryConnector) throw new Error("Wallet not available");
        const result = await connectAsync({
          connector: primaryConnector,
          chainId: base.id,
        });
        targetAddress = result.accounts[0];
      }

      await writeContract({
        account: targetAddress as Address,
        address: bountyAddress as Address,
        abi: POIDH_ABI,
        functionName: "initiateVote",
        args: [BigInt(claimId)],
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start vote");
    }
  };

  const handleVote = async (support: boolean) => {
    setError(null);
    try {
      let targetAddress = address;
      if (!targetAddress) {
        if (!primaryConnector) throw new Error("Wallet not available");
        const result = await connectAsync({
          connector: primaryConnector,
          chainId: base.id,
        });
        targetAddress = result.accounts[0];
      }

      await writeContract({
        account: targetAddress as Address,
        address: bountyAddress as Address,
        abi: POIDH_ABI,
        functionName: "vote",
        args: [support],
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote");
    }
  };

  const handleResolveVote = async () => {
    setError(null);
    try {
      let targetAddress = address;
      if (!targetAddress) {
        if (!primaryConnector) throw new Error("Wallet not available");
        const result = await connectAsync({
          connector: primaryConnector,
          chainId: base.id,
        });
        targetAddress = result.accounts[0];
      }

      await writeContract({
        account: targetAddress as Address,
        address: bountyAddress as Address,
        abi: POIDH_ABI,
        functionName: "resolveVote",
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve vote");
    }
  };

  const handleAcceptClaim = async () => {
    setError(null);
    try {
      let targetAddress = address;
      if (!targetAddress) {
        if (!primaryConnector) throw new Error("Wallet not available");
        const result = await connectAsync({
          connector: primaryConnector,
          chainId: base.id,
        });
        targetAddress = result.accounts[0];
      }

      await writeContract({
        account: targetAddress as Address,
        address: bountyAddress as Address,
        abi: POIDH_ABI,
        functionName: "acceptClaim",
        args: [BigInt(claimId)],
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept claim");
    }
  };

  const isLoading = isLoadingBounty || isLoadingClaims;
  const isSubmitting = isWriting || isConfirming;

  const isIssuer = bounty && address && bounty.issuer.toLowerCase() === address.toLowerCase();
  const hasStake = userStake && userStake > 0n;
  const canStartVote = bounty?.state === BountyState.OPEN && (isIssuer || hasStake);

  const votingClaimId = voteState?.claimId !== undefined ? Number(voteState.claimId) : null;
  const isVotingOnThis = bounty?.state === BountyState.VOTING && votingClaimId === claimId;
  const votingDeadline = voteState?.deadline ? Number(voteState.deadline) * 1000 : null;
  const isVotingExpired = votingDeadline ? Date.now() > votingDeadline : false;

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState("");
  useEffect(() => {
    if (!votingDeadline || !isVotingOnThis) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const remaining = votingDeadline - now;
      if (remaining <= 0) {
        setTimeRemaining("Voting ended");
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [votingDeadline, isVotingOnThis]);

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Loading claim...</p>
        </div>
      </main>
    );
  }

  if (!bounty || !claim) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-black px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900">
          <AlertCircle className="h-8 w-8 text-zinc-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-300">Claim not found</p>
        <p className="mt-1 text-xs text-zinc-500">This claim may have been removed</p>
        <Link
          href={`/bounty/${bountyAddress}`}
          className="mt-4 text-sm font-medium text-rose-400 hover:underline"
        >
          Back to bounty
        </Link>
      </main>
    );
  }

  const proofImageUrl = claim.proof?.imageUrl;
  const proofDescription = claim.proof?.description || claim.name;

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
        <header className="shrink-0 flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/bounty/${bountyAddress}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            {isVotingOnThis && (
              <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400">
                VOTING
              </span>
            )}
          </div>
          {context?.user && (
            <UserHeader
              displayName={context.user.displayName}
              username={context.user.username}
              avatarUrl={context.user.pfpUrl}
            />
          )}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 scrollbar-hide">
          <div className="flex flex-col gap-4 pb-6">
            {/* Proof Image */}
            {proofImageUrl ? (
              <div className="rounded-xl overflow-hidden bg-zinc-900">
                <img
                  src={proofImageUrl}
                  alt={claim.name}
                  className="w-full object-contain max-h-[400px]"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-900 h-48 flex items-center justify-center">
                <p className="text-sm text-zinc-500">No image provided</p>
              </div>
            )}

            {/* Claimant */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={claimantAvatarUrl} alt={claimantDisplayName} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400">
                  {claimantDisplayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white">{claimantDisplayName}</p>
                <p className="text-xs text-zinc-500">Submitted this claim</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {proofDescription}
              </p>
              {claim.proof?.externalUrl && (
                <a
                  href={claim.proof.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View external link
                </a>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Voting Status */}
            {isVotingOnThis && voteState && (
              <Card className="border-amber-500/50 bg-amber-500/5 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-amber-400 animate-pulse" />
                      <span className="text-sm font-bold text-amber-400">
                        {timeRemaining}
                      </span>
                    </div>
                    {isVotingExpired && (
                      <Button
                        size="sm"
                        className="bg-amber-500 text-black hover:bg-amber-400"
                        onClick={handleResolveVote}
                        disabled={isSubmitting}
                      >
                        Resolve Vote
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-green-500/10 p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="text-xl font-bold text-green-400">
                        Ξ{Number(formatEther(voteState.yes)).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </div>
                      <div className="text-[10px] text-green-400/70 uppercase tracking-wide">Yes</div>
                    </div>
                    <div className="rounded-xl bg-red-500/10 p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="text-xl font-bold text-red-400">
                        Ξ{Number(formatEther(voteState.no)).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </div>
                      <div className="text-[10px] text-red-400/70 uppercase tracking-wide">No</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Fixed Action Buttons - Above Nav */}
        <div className="shrink-0 px-4 pt-3 bg-black">
          {isVotingOnThis && !hasVoted && hasStake ? (
            <div className="flex gap-3">
              <Button
                className="flex-1 h-11 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleVote(true)}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-4 w-4" />
                Vote Yes
              </Button>
              <Button
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => handleVote(false)}
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4" />
                Vote No
              </Button>
            </div>
          ) : bounty.state === BountyState.OPEN && isIssuer ? (
            // Issuer can accept (solo) or start vote (joinable)
            bounty.joinable ? (
              <Button
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                onClick={handleStartVote}
                disabled={isSubmitting}
              >
                <Trophy className="h-4 w-4" />
                Select for Voting
              </Button>
            ) : (
              <Button
                className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                onClick={handleAcceptClaim}
                disabled={isSubmitting}
              >
                <Trophy className="h-4 w-4" />
                Accept & Pay Out
              </Button>
            )
          ) : null}
        </div>
      </div>
      <NavBar />
    </main>
  );
}
