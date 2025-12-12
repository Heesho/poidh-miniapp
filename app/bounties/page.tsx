"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  Trophy,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useAccount, useConnect } from "wagmi";
import { base } from "wagmi/chains";

import { NavBar } from "@/components/nav-bar";
import { BountyCard } from "@/components/bounty-card";
import { UserHeader } from "@/components/user-header";
import { cn } from "@/lib/utils";
import { useBounties } from "@/hooks/useBounties";
import { useUserClaimedBounties } from "@/hooks/useClaims";
import { useUserJoinedBounties } from "@/hooks/useFunders";
import { BountyState } from "@/lib/contracts";
import { DEMO_MODE, DEMO_USER_ADDRESS } from "@/lib/mockData";

type MiniAppContext = {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
};

type SortFilter = "top" | "trending" | "new";
type OwnerFilter = "all" | "created" | "joined" | "claimed";
type StatusFilter = "all" | BountyState;

export default function BountiesPage() {
  const readyRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortFilter, setSortFilter] = useState<SortFilter>("new");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

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

  // Use demo user address in demo mode, otherwise use wallet address
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

  // Fetch bounties
  const { bounties, isLoading } = useBounties(100, 0);

  // Fetch user's claimed bounties
  const { userClaimedBounties } = useUserClaimedBounties(bounties, address);

  // Fetch user's joined bounties (staked but not issuer)
  const { userJoinedBounties } = useUserJoinedBounties(bounties, address);

  // Filter and sort bounties
  const filteredBounties = useMemo(() => {
    let result = [...bounties];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.metadata?.title?.toLowerCase().includes(query) ||
          b.metadata?.description?.toLowerCase().includes(query) ||
          b.address.toLowerCase().includes(query)
      );
    }

    // Owner filter
    if (ownerFilter === "created" && address) {
      result = result.filter(
        (b) => b.issuer.toLowerCase() === address.toLowerCase()
      );
    } else if (ownerFilter === "joined" && address) {
      result = result.filter(
        (b) => userJoinedBounties.has(b.address.toLowerCase())
      );
    } else if (ownerFilter === "claimed" && address) {
      result = result.filter(
        (b) => userClaimedBounties.has(b.address.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.state === statusFilter);
    }

    // Sort
    switch (sortFilter) {
      case "top":
        result.sort((a, b) => {
          if (b.totalStaked > a.totalStaked) return 1;
          if (b.totalStaked < a.totalStaked) return -1;
          return 0;
        });
        break;
      case "trending":
        result.sort((a, b) => {
          if (b.claimsCount > a.claimsCount) return 1;
          if (b.claimsCount < a.claimsCount) return -1;
          return 0;
        });
        break;
      case "new":
      default:
        break;
    }

    return result;
  }, [bounties, searchQuery, ownerFilter, statusFilter, sortFilter, address, userClaimedBounties, userJoinedBounties]);

  const sortOptions: { id: SortFilter; label: string }[] = [
    { id: "new", label: "Latest" },
    { id: "top", label: "Highest" },
    { id: "trending", label: "Hot" },
  ];

  const ownerOptions: { id: OwnerFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "created", label: "Created" },
    { id: "joined", label: "Joined" },
    { id: "claimed", label: "Claimed" },
  ];

  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: BountyState.OPEN, label: "Open" },
    { id: BountyState.VOTING, label: "Voting" },
    { id: BountyState.CLOSED, label: "Closed" },
    { id: BountyState.CANCELLED, label: "Cancelled" },
  ];

  const activeFiltersCount =
    (ownerFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (sortFilter !== "new" ? 1 : 0);

  const getFilterLabel = () => {
    const parts: string[] = [];
    if (ownerFilter !== "all") {
      parts.push(ownerOptions.find(o => o.id === ownerFilter)?.label || "");
    }
    if (statusFilter !== "all") {
      parts.push(statusOptions.find(o => o.id === statusFilter)?.label || "");
    }
    if (sortFilter !== "new") {
      parts.push(sortOptions.find(o => o.id === sortFilter)?.label || "");
    }
    return parts.length > 0 ? parts.join(", ") : "Filters";
  };

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
                Bounties
              </h1>
              <p className="text-[11px] text-zinc-400">
                {filteredBounties.length} available
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

        {/* Fixed Search Bar with Filter Button */}
        <div className="shrink-0 px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bounties..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-12 pr-10 text-sm text-white placeholder-zinc-500 transition-colors focus:border-zinc-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "relative flex items-center justify-center h-11 w-11 rounded-xl border transition-colors",
              showFilters || activeFiltersCount > 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="shrink-0 px-4 pb-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 w-12 shrink-0">Sort</span>
                <div className="flex gap-1.5 flex-1">
                  {sortOptions.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSortFilter(id)}
                      className={cn(
                        "flex-1 h-7 text-[11px] font-medium rounded-md transition-colors",
                        sortFilter === id
                          ? "bg-rose-500 text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 w-12 shrink-0">Show</span>
                <div className="flex gap-1.5 flex-1">
                  {ownerOptions.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setOwnerFilter(id)}
                      className={cn(
                        "flex-1 h-7 text-[11px] font-medium rounded-md transition-colors",
                        ownerFilter === id
                          ? "bg-rose-500 text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 w-12 shrink-0">Status</span>
                <div className="flex gap-1.5 flex-1">
                  {statusOptions.map(({ id, label }) => (
                    <button
                      key={id.toString()}
                      onClick={() => setStatusFilter(id)}
                      className={cn(
                        "flex-1 h-7 text-[11px] font-medium rounded-md transition-colors",
                        statusFilter === id
                          ? "bg-rose-500 text-white"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      {label.replace(" Status", "")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Bounties List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
              <p className="mt-3 text-sm text-zinc-400">Loading bounties...</p>
            </div>
          ) : filteredBounties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900">
                <Trophy className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-300">
                No bounties found
              </p>
              <p className="mt-1 text-xs text-zinc-500 max-w-[240px]">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : ownerFilter === "created"
                    ? "You haven't created any bounties yet"
                    : ownerFilter === "joined"
                      ? "You haven't joined any bounties yet"
                      : ownerFilter === "claimed"
                        ? "You haven't submitted any claims yet"
                        : "Be the first to create one!"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4">
              {filteredBounties.map((bounty) => (
                <BountyCard
                  key={bounty.address}
                  bounty={bounty}
                  userAddress={address}
                  userJoinedBounties={userJoinedBounties}
                  userClaimedBounties={userClaimedBounties}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <NavBar />
    </main>
  );
}
