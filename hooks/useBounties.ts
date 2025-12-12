import { useQuery } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

import {
  CONTRACT_ADDRESSES,
  POIDH_FACTORY_ABI,
  POIDH_ABI,
  BountyState,
  type BountyMetadata,
} from "@/lib/contracts";
import { fetchFromIPFS } from "@/lib/ipfs";
import { DEMO_MODE, MOCK_BOUNTIES, MOCK_FUNDERS, MOCK_USER_VOTES } from "@/lib/mockData";

export type BountyData = {
  address: Address;
  issuer: Address;
  metadataURI: string;
  state: BountyState;
  joinable: boolean;
  totalStaked: bigint;
  claimsCount: bigint;
  metadata?: BountyMetadata | null;
};

/**
 * Fetch total bounties count from factory
 */
export function useBountiesCount() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.factory as Address,
    abi: POIDH_FACTORY_ABI,
    functionName: "getBountiesCount",
    chainId: base.id,
  });
}

/**
 * Fetch paginated list of bounty addresses from factory
 */
export function useBountyAddresses(limit: number, offset: number) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.factory as Address,
    abi: POIDH_FACTORY_ABI,
    functionName: "getBounties",
    args: [BigInt(limit), BigInt(offset)],
    chainId: base.id,
  });
}

/**
 * Fetch detailed bounty data for a list of addresses
 */
export function useBountiesData(addresses: Address[]) {
  // Create contract reads for each bounty
  const contracts = addresses.flatMap((addr) => [
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "issuer" as const,
      chainId: base.id,
    },
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "metadataURI" as const,
      chainId: base.id,
    },
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "state" as const,
      chainId: base.id,
    },
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "joinable" as const,
      chainId: base.id,
    },
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "totalStaked" as const,
      chainId: base.id,
    },
    {
      address: addr,
      abi: POIDH_ABI,
      functionName: "getClaimsCount" as const,
      chainId: base.id,
    },
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: addresses.length > 0,
    },
  });

  // Parse results into bounty objects
  const bounties: BountyData[] = [];
  if (data) {
    for (let i = 0; i < addresses.length; i++) {
      const baseIndex = i * 6;
      const issuer = data[baseIndex]?.result as Address | undefined;
      const metadataURI = data[baseIndex + 1]?.result as string | undefined;
      const state = data[baseIndex + 2]?.result as number | undefined;
      const joinable = data[baseIndex + 3]?.result as boolean | undefined;
      const totalStaked = data[baseIndex + 4]?.result as bigint | undefined;
      const claimsCount = data[baseIndex + 5]?.result as bigint | undefined;

      if (issuer !== undefined) {
        bounties.push({
          address: addresses[i],
          issuer: issuer,
          metadataURI: metadataURI ?? "",
          state: (state ?? 0) as BountyState,
          joinable: joinable ?? false,
          totalStaked: totalStaked ?? 0n,
          claimsCount: claimsCount ?? 0n,
        });
      }
    }
  }

  return { bounties, isLoading, error, refetch };
}

/**
 * Fetch a single bounty's full data including metadata
 */
export function useBounty(address: Address | undefined) {
  // Demo mode - return mock bounty
  if (DEMO_MODE && address) {
    const mockBounty = MOCK_BOUNTIES.find(
      (b) => b.address.toLowerCase() === address.toLowerCase()
    );
    if (mockBounty) {
      return {
        bounty: {
          ...mockBounty,
          currentVote:
            mockBounty.state === BountyState.VOTING
              ? {
                  claimId: 0n,
                  yes: 1500000000000000000n,
                  no: 500000000000000000n,
                  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
                  votingRound: 1n,
                }
              : undefined,
        },
        isLoading: false,
      };
    }
    return { bounty: null, isLoading: false };
  }

  const { data: issuer } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "issuer",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: metadataURI } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "metadataURI",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: state } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "state",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: joinable } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "joinable",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: totalStaked } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "totalStaked",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: claimsCount } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "getClaimsCount",
    chainId: base.id,
    query: { enabled: !!address },
  });

  const { data: currentVote } = useReadContract({
    address: address,
    abi: POIDH_ABI,
    functionName: "currentVote",
    chainId: base.id,
    query: { enabled: !!address },
  });

  // Fetch metadata from IPFS
  const { data: metadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ["bounty-metadata", metadataURI],
    queryFn: () => fetchFromIPFS<BountyMetadata>(metadataURI as string),
    enabled: !!metadataURI,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading =
    issuer === undefined ||
    state === undefined ||
    totalStaked === undefined ||
    isLoadingMetadata;

  return {
    bounty:
      address && issuer !== undefined
        ? {
            address,
            issuer: issuer as Address,
            metadataURI: metadataURI ?? "",
            state: (state ?? 0) as BountyState,
            joinable: joinable ?? false,
            totalStaked: totalStaked ?? 0n,
            claimsCount: claimsCount ?? 0n,
            metadata,
            currentVote: currentVote
              ? {
                  claimId: currentVote[0],
                  yes: currentVote[1],
                  no: currentVote[2],
                  deadline: currentVote[3],
                  votingRound: currentVote[4],
                }
              : undefined,
          }
        : null,
    isLoading,
  };
}

/**
 * Fetch user's stake in a bounty
 */
export function useUserStake(bountyAddress: Address | undefined, userAddress: Address | undefined) {
  // Demo mode - check mock funders
  if (DEMO_MODE && bountyAddress && userAddress) {
    const funders = MOCK_FUNDERS[bountyAddress] || [];
    const funder = funders.find(f => f.address.toLowerCase() === userAddress.toLowerCase());
    return {
      data: funder?.amount || 0n,
      isLoading: false,
      error: null,
    };
  }

  return useReadContract({
    address: bountyAddress,
    abi: POIDH_ABI,
    functionName: "account_Stake",
    args: userAddress ? [userAddress] : undefined,
    chainId: base.id,
    query: { enabled: !!bountyAddress && !!userAddress && !DEMO_MODE },
  });
}

/**
 * Check if user has voted in current round
 */
export function useHasVoted(
  bountyAddress: Address | undefined,
  userAddress: Address | undefined,
  votingRound: bigint | undefined
) {
  // Demo mode - check mock votes
  if (DEMO_MODE && bountyAddress && userAddress) {
    const key = `${bountyAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
    const hasVoted = key in MOCK_USER_VOTES;
    return {
      data: hasVoted,
      isLoading: false,
      error: null,
    };
  }

  return useReadContract({
    address: bountyAddress,
    abi: POIDH_ABI,
    functionName: "account_Round_HasVoted",
    args: userAddress && votingRound !== undefined ? [userAddress, votingRound] : undefined,
    chainId: base.id,
    query: { enabled: !!bountyAddress && !!userAddress && votingRound !== undefined && !DEMO_MODE },
  });
}

/**
 * Combined hook for fetching bounties with metadata
 */
export function useBounties(limit: number = 10, offset: number = 0) {
  // Demo mode - return mock data
  if (DEMO_MODE) {
    const mockBounties = MOCK_BOUNTIES.slice(offset, offset + limit);
    return {
      bounties: mockBounties,
      totalCount: MOCK_BOUNTIES.length,
      isLoading: false,
      refetch: () => {},
    };
  }

  const { data: count, isLoading: isLoadingCount } = useBountiesCount();
  const { data: addresses, isLoading: isLoadingAddresses } = useBountyAddresses(limit, offset);
  const { bounties, isLoading: isLoadingData, refetch } = useBountiesData(
    (addresses as Address[]) ?? []
  );

  // Fetch metadata for all bounties
  const { data: metadataMap, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ["bounties-metadata", bounties.map((b) => b.metadataURI)],
    queryFn: async () => {
      const map = new Map<string, BountyMetadata | null>();
      await Promise.all(
        bounties.map(async (bounty) => {
          if (bounty.metadataURI) {
            const metadata = await fetchFromIPFS<BountyMetadata>(bounty.metadataURI);
            map.set(bounty.metadataURI, metadata);
          }
        })
      );
      return map;
    },
    enabled: bounties.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Merge metadata into bounties
  const bountiesWithMetadata = bounties.map((bounty) => ({
    ...bounty,
    metadata: metadataMap?.get(bounty.metadataURI) ?? null,
  }));

  return {
    bounties: bountiesWithMetadata,
    totalCount: count ? Number(count) : 0,
    isLoading: isLoadingCount || isLoadingAddresses || isLoadingData || isLoadingMetadata,
    refetch,
  };
}
