"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  ArrowLeft,
  Users,
  Coins,
  MessageSquare,
  AlertCircle,
  Timer,
  Send,
  XCircle,
  CheckCircle2,
  ImagePlus,
  Trophy,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatEther, parseEther, type Address } from "viem";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { UserHeader } from "@/components/user-header";
import { StateBadge } from "@/components/state-badge";
import { ClaimCard } from "@/components/claim-card";
import { useBounty, useUserStake, useHasVoted } from "@/hooks/useBounties";
import { useClaims, useVoteState } from "@/hooks/useClaims";
import { useFunders } from "@/hooks/useFunders";
import { BountyState, POIDH_ABI } from "@/lib/contracts";
import { uploadToIPFS, toIPFSUri } from "@/lib/ipfs";
import { cn } from "@/lib/utils";
import { DEMO_MODE, DEMO_USER_ADDRESS, getMockProfile, getMockUserVote, MOCK_WINNERS } from "@/lib/mockData";

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

export default function BountyDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: bountyAddress } = use(params);
  const readyRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);

  // UI state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [claimName, setClaimName] = useState("");
  const [claimImage, setClaimImage] = useState<File | null>(null);
  const [joinAmount, setJoinAmount] = useState("");
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

  // Fetch bounty data
  const { bounty, isLoading: isLoadingBounty } = useBounty(
    bountyAddress as Address
  );
  const { claims, isLoading: isLoadingClaims, refetch: refetchClaims } = useClaims(
    bountyAddress as Address
  );
  const { voteState, refetch: refetchVote } = useVoteState(bountyAddress as Address);
  const { funders } = useFunders(bountyAddress as Address);
  const { data: userStake } = useUserStake(
    bountyAddress as Address,
    address
  );
  const { data: hasVoted } = useHasVoted(
    bountyAddress as Address,
    address,
    voteState?.votingRound
  );

  // Get user's vote choice in demo mode (to show "Voted Yes" or "Voted No")
  const userVoteChoice = DEMO_MODE && address ? getMockUserVote(bountyAddress, address) : undefined;

  // Get mock profile in demo mode
  const mockIssuerProfile = DEMO_MODE && bounty?.issuer ? getMockProfile(bounty.issuer) : null;

  // Fetch issuer profile (skip in demo mode)
  const { data: issuerProfile } = useQuery<{
    user: {
      fid: number | null;
      username: string | null;
      displayName: string | null;
      pfpUrl: string | null;
    } | null;
  }>({
    queryKey: ["neynar-user", bounty?.issuer],
    queryFn: async () => {
      const res = await fetch(
        `/api/neynar/user?address=${encodeURIComponent(bounty!.issuer)}`
      );
      if (!res.ok) return { user: null };
      return res.json();
    },
    enabled: !!bounty?.issuer && !DEMO_MODE,
    staleTime: 60_000,
  });

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
      setClaimName("");
      setClaimImage(null);
      setJoinAmount("");
      setShowClaimForm(false);
      setShowJoinForm(false);
      setError(null);
      resetWrite();
      refetchClaims();
      refetchVote();
    }
  }, [receipt, refetchClaims, refetchVote, resetWrite]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
      resetWrite();
    }
  }, [writeError, resetWrite]);

  // Actions
  const handleJoin = useCallback(async () => {
    if (!joinAmount || parseFloat(joinAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

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
        functionName: "stake",
        value: parseEther(joinAmount),
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    }
  }, [address, bountyAddress, connectAsync, joinAmount, primaryConnector, writeContract]);

  const handleWithdraw = useCallback(async () => {
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
        functionName: "withdraw",
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw");
    }
  }, [address, bountyAddress, connectAsync, primaryConnector, writeContract]);

  const handleCancel = useCallback(async () => {
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
        functionName: "cancel",
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    }
  }, [address, bountyAddress, connectAsync, primaryConnector, writeContract]);

  const handleSubmitClaim = useCallback(async () => {
    if (!claimName.trim()) {
      setError("Claim name is required");
      return;
    }

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

      // Upload image to IPFS if provided
      let proofURI = "";
      if (claimImage) {
        // TODO: Upload image to IPFS and get URI
        // For now, just use a placeholder
        proofURI = `ipfs://image-${Date.now()}`;
      }

      await writeContract({
        account: targetAddress as Address,
        address: bountyAddress as Address,
        abi: POIDH_ABI,
        functionName: "submitClaim",
        args: [claimName.trim(), proofURI],
        chainId: base.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit claim");
    }
  }, [address, bountyAddress, claimName, claimImage, connectAsync, primaryConnector, writeContract]);

  const handleStartVote = useCallback(async (claimId: number) => {
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
  }, [address, bountyAddress, connectAsync, primaryConnector, writeContract]);

  const handleVote = useCallback(async (support: boolean) => {
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
  }, [address, bountyAddress, connectAsync, primaryConnector, writeContract]);

  const handleResolveVote = useCallback(async () => {
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
  }, [address, bountyAddress, connectAsync, primaryConnector, writeContract]);

  const isLoading = isLoadingBounty || isLoadingClaims;
  const isSubmitting = isWriting || isConfirming;

  const isIssuer =
    bounty && address && bounty.issuer.toLowerCase() === address.toLowerCase();
  const hasStake = userStake && userStake > 0n;
  const hasClaimed = address && claims.some(
    (c) => c.claimant.toLowerCase() === address.toLowerCase()
  );
  const canWithdraw =
    (bounty?.state === BountyState.OPEN && hasStake && !isIssuer) ||
    bounty?.state === BountyState.CANCELLED;

  const votingClaimId = voteState?.claimId !== undefined ? Number(voteState.claimId) : null;
  const votingDeadline = voteState?.deadline ? Number(voteState.deadline) * 1000 : null;
  const isVotingExpired = votingDeadline ? Date.now() > votingDeadline : false;
  const totalVoted = voteState ? voteState.yes + voteState.no : 0n;
  const allVotesCast = bounty && totalVoted >= bounty.totalStaked;
  const canResolveVote = isVotingExpired || allVotesCast;

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState("");
  useEffect(() => {
    if (!votingDeadline || bounty?.state !== BountyState.VOTING) {
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
  }, [votingDeadline, bounty?.state]);

  const issuerDisplayName = mockIssuerProfile
    ? mockIssuerProfile.displayName || mockIssuerProfile.username
    : issuerProfile?.user?.displayName ||
      issuerProfile?.user?.username ||
      (bounty ? formatAddress(bounty.issuer) : "");
  const issuerAvatarUrl = mockIssuerProfile
    ? mockIssuerProfile.pfpUrl
    : issuerProfile?.user?.pfpUrl ||
      (bounty
        ? `https://api.dicebear.com/7.x/shapes/svg?seed=${bounty.issuer.toLowerCase()}`
        : "");

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400">Loading bounty...</p>
        </div>
      </main>
    );
  }

  if (!bounty) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-black px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900">
          <AlertCircle className="h-8 w-8 text-zinc-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-300">Bounty not found</p>
        <p className="mt-1 text-xs text-zinc-500">This bounty may have been removed</p>
        <Link
          href="/bounties"
          className="mt-4 text-sm font-medium text-rose-400 hover:underline"
        >
          Back to bounties
        </Link>
      </main>
    );
  }

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
          <div className="flex items-center gap-2">
            <Link
              href="/bounties"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <StateBadge state={bounty.state} size="sm" />
            {/* User relationship tag */}
            {isIssuer ? (
              <span className="inline-flex items-center rounded-full font-semibold uppercase tracking-wider px-2 py-0.5 text-[9px] border border-amber-500/50 text-amber-400">
                Issued
              </span>
            ) : hasStake ? (
              <span className="inline-flex items-center rounded-full font-semibold uppercase tracking-wider px-2 py-0.5 text-[9px] border border-blue-500/50 text-blue-400">
                Joined
              </span>
            ) : hasClaimed ? (
              <span className="inline-flex items-center rounded-full font-semibold uppercase tracking-wider px-2 py-0.5 text-[9px] border border-rose-500/50 text-rose-400">
                Claimed
              </span>
            ) : null}
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
            {/* Title */}
            <h1 className="text-xl font-bold text-white leading-tight">
              {bounty.metadata?.title || "Untitled Bounty"}
            </h1>

            {/* Funders */}
            {funders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {funders.map((funder) => {
                  const profile = DEMO_MODE ? getMockProfile(funder.address) : null;
                  const displayName = profile?.displayName || profile?.username || formatAddress(funder.address);
                  const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${funder.address.toLowerCase()}`;
                  const isCreator = bounty && funder.address.toLowerCase() === bounty.issuer.toLowerCase();

                  return (
                    <div
                      key={funder.address}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border",
                        isCreator
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-zinc-900 border-zinc-800"
                      )}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-zinc-800 text-white text-[8px]">
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "text-[11px] font-medium",
                        isCreator ? "text-rose-300" : "text-zinc-300"
                      )}>
                        {displayName}
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        isCreator ? "text-rose-400" : "text-zinc-500"
                      )}>
                        Ξ{Number(formatEther(funder.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Description */}
            {bounty.metadata?.description && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {bounty.metadata.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Coins className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    Ξ{Number(formatEther(bounty.totalStaked)).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Reward</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <MessageSquare className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-lg font-bold text-white">
                    {claims.length}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Claims</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className={cn("h-4 w-4", bounty.joinable ? "text-blue-400" : "text-zinc-500")} />
                  </div>
                  <div className="text-lg font-bold text-white">
                    {bounty.joinable ? "Yes" : "No"}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Joinable</div>
                </CardContent>
              </Card>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Voting Claim */}
            {bounty.state === BountyState.VOTING && voteState && votingClaimId !== null && (() => {
              const votingClaim = claims.find(c => c.id === votingClaimId);
              if (!votingClaim) return null;
              const profile = DEMO_MODE ? getMockProfile(votingClaim.claimant) : null;
              const displayName = profile?.displayName || profile?.username || formatAddress(votingClaim.claimant);
              const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${votingClaim.claimant.toLowerCase()}`;
              const proofImageUrl = votingClaim.proof?.imageUrl;
              const description = votingClaim.name.length > 40 ? votingClaim.name.slice(0, 40) + "..." : votingClaim.name;

              return (
                <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 overflow-hidden">
                  <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">Voting</span>
                    <div className="flex items-center gap-1.5">
                      <Timer className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-amber-400">
                        {allVotesCast ? "Ready" : timeRemaining}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/claim/${bountyAddress}/${votingClaim.id}`}
                    className="flex items-center gap-3 px-3 pb-3 hover:bg-amber-500/10 transition-colors"
                  >
                    {proofImageUrl ? (
                      <img
                        src={proofImageUrl}
                        alt={votingClaim.name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">{description}</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="bg-zinc-800 text-[6px] text-zinc-400">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-zinc-400">{displayName}</span>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">#{votingClaim.id}</span>
                  </Link>
                  <div className="grid grid-cols-2 gap-px bg-amber-500/30">
                    <div className="bg-black p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-lg font-bold text-green-400">
                          Ξ{Number(formatEther(voteState.yes)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="bg-black p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-lg font-bold text-red-400">
                          Ξ{Number(formatEther(voteState.no)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Winner (Closed bounty) */}
            {bounty.state === BountyState.CLOSED && (() => {
              const winningClaimId = DEMO_MODE ? MOCK_WINNERS[bountyAddress] : null;
              if (winningClaimId === undefined || winningClaimId === null) return null;
              const winningClaim = claims.find(c => c.id === winningClaimId);
              if (!winningClaim) return null;
              const profile = DEMO_MODE ? getMockProfile(winningClaim.claimant) : null;
              const displayName = profile?.displayName || profile?.username || formatAddress(winningClaim.claimant);
              const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${winningClaim.claimant.toLowerCase()}`;
              const proofImageUrl = winningClaim.proof?.imageUrl;
              const description = winningClaim.name.length > 40 ? winningClaim.name.slice(0, 40) + "..." : winningClaim.name;

              return (
                <div className="rounded-xl border border-rose-500/50 bg-rose-500/5 overflow-hidden">
                  <div className="px-3 pt-3 pb-2 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-bold text-rose-400 uppercase tracking-wide">Winner</span>
                  </div>
                  <Link
                    href={`/claim/${bountyAddress}/${winningClaim.id}`}
                    className="flex items-center gap-3 px-3 pb-3 hover:bg-rose-500/10 transition-colors"
                  >
                    {proofImageUrl ? (
                      <img
                        src={proofImageUrl}
                        alt={winningClaim.name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate">{description}</span>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="bg-zinc-800 text-[6px] text-zinc-400">
                            {displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-zinc-400">{displayName}</span>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">#{winningClaim.id}</span>
                  </Link>
                </div>
              );
            })()}

            {/* Claims List */}
            {(() => {
              // Filter out the featured claim (voting or winner)
              const winningClaimId = DEMO_MODE ? MOCK_WINNERS[bountyAddress] : null;
              const filteredClaims = claims.filter(claim => {
                // Skip if this is the voting claim
                if (bounty.state === BountyState.VOTING && votingClaimId === claim.id) return false;
                // Skip if this is the winning claim
                if (bounty.state === BountyState.CLOSED && winningClaimId === claim.id) return false;
                return true;
              });

              return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">
                  Claims
                </h2>
                <span className="text-xs text-zinc-500">
                  {claims.length} {claims.length === 1 ? "submission" : "submissions"}
                </span>
              </div>
              {filteredClaims.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-zinc-900">
                    <MessageSquare className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-300">No claims yet</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Be the first to submit proof
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredClaims.map((claim) => {
                    const profile = DEMO_MODE ? getMockProfile(claim.claimant) : null;
                    const displayName = profile?.displayName || profile?.username || formatAddress(claim.claimant);
                    const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${claim.claimant.toLowerCase()}`;
                    const proofImageUrl = claim.proof?.imageUrl;

                    return (
                      <Link
                        key={claim.id}
                        href={`/claim/${bountyAddress}/${claim.id}`}
                        className="flex items-center gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-3 transition-colors hover:bg-zinc-800/50"
                      >
                        {/* Proof image or placeholder */}
                        {proofImageUrl ? (
                          <img
                            src={proofImageUrl}
                            alt={claim.name}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <MessageSquare className="h-6 w-6 text-zinc-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate block">
                            {claim.name.length > 40 ? claim.name.slice(0, 40) + "..." : claim.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={avatarUrl} alt={displayName} />
                              <AvatarFallback className="bg-zinc-800 text-[6px] text-zinc-400">
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-zinc-400">{displayName}</span>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 shrink-0">#{claim.id}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
              );
            })()}
          </div>
        </div>

        {/* Fixed Action Buttons - Above Nav */}
        {bounty.state === BountyState.OPEN && (
          <div className="shrink-0 px-4 pt-3 bg-black flex flex-col gap-3">
            {/* Join Form */}
            {showJoinForm && (
              <div className="relative">
                <input
                  type="number"
                  value={joinAmount}
                  onChange={(e) => setJoinAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  className="w-full rounded-xl border-0 bg-zinc-900 py-3 pl-10 pr-4 text-base text-white placeholder-zinc-500 focus:outline-none"
                  disabled={isSubmitting}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <span className="text-lg font-semibold text-zinc-300">Ξ</span>
                </div>
              </div>
            )}

            {/* Claim Form */}
            {showClaimForm && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-center w-full aspect-square rounded-xl bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setClaimImage(file);
                      }
                    }}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  {claimImage ? (
                    <img
                      src={URL.createObjectURL(claimImage)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImagePlus className="h-8 w-8 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Tap to add image</span>
                    </div>
                  )}
                </label>
                <textarea
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="Describe your proof... (links, context, etc.)"
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-xl border-0 bg-zinc-900 py-3 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {showJoinForm ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={() => setShowJoinForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={handleJoin}
                    disabled={isSubmitting || !joinAmount}
                  >
                    <Coins className="h-4 w-4" />
                    Join
                  </Button>
                </>
              ) : showClaimForm ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={() => setShowClaimForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-11 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white"
                    onClick={handleSubmitClaim}
                    disabled={isSubmitting || !claimName.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Submit
                  </Button>
                </>
              ) : isIssuer ? (
                // Issuer sees Cancel Bounty button
                <Button
                  className="w-full h-11 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Bounty
                </Button>
              ) : bounty.joinable ? (
                <>
                  {hasStake ? (
                    <Button
                      className="flex-1 h-11 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      onClick={handleWithdraw}
                      disabled={isSubmitting}
                    >
                      <Coins className="h-4 w-4" />
                      Withdraw
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => {
                        setShowJoinForm(true);
                        setShowClaimForm(false);
                      }}
                    >
                      <Coins className="h-4 w-4" />
                      Join
                    </Button>
                  )}
                  <Button
                    className="flex-1 h-11 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white"
                    onClick={() => {
                      setShowClaimForm(true);
                      setShowJoinForm(false);
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Submit Claim
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full h-11 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white"
                  onClick={() => setShowClaimForm(true)}
                >
                  <Send className="h-4 w-4" />
                  Submit Claim
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Voting Action Buttons */}
        {bounty.state === BountyState.VOTING && (
          <div className="shrink-0 px-4 pt-3 bg-black">
            {canResolveVote ? (
              // Anyone can resolve when voting time has passed or all votes cast
              <Button
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                onClick={handleResolveVote}
                disabled={isSubmitting}
              >
                <Timer className="h-4 w-4" />
                Resolve Vote
              </Button>
            ) : hasStake && hasVoted ? (
              // User has staked and already voted - show their vote
              <Button
                className={cn(
                  "w-full h-11 cursor-not-allowed",
                  userVoteChoice === true
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}
                disabled
              >
                {userVoteChoice === true ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Voted Yes
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Voted No
                  </>
                )}
              </Button>
            ) : hasStake && !hasVoted ? (
              // User has staked and hasn't voted yet
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
            ) : null}
          </div>
        )}

        {/* Cancelled - Withdraw Button */}
        {bounty.state === BountyState.CANCELLED && hasStake && (
          <div className="shrink-0 px-4 pt-3 bg-black">
            <Button
              className="w-full h-11 bg-zinc-700 hover:bg-zinc-600 text-white"
              onClick={handleWithdraw}
              disabled={isSubmitting}
            >
              <Coins className="h-4 w-4" />
              Withdraw Stake
            </Button>
          </div>
        )}
      </div>
      <NavBar />
    </main>
  );
}
