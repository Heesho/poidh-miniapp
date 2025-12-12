import { useQuery } from "@tanstack/react-query";
import { useReadContract, useReadContracts } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

import { POIDH_ABI } from "@/lib/contracts";
import { fetchFromIPFS } from "@/lib/ipfs";
import { DEMO_MODE, MOCK_CLAIMS } from "@/lib/mockData";
import type { BountyData } from "./useBounties";

export type ClaimData = {
  id: number;
  claimant: Address;
  name: string;
  proofURI: string;
  proof?: {
    description?: string;
    imageUrl?: string;
    externalUrl?: string;
  } | null;
};

/**
 * Fetch all claims for a bounty
 */
export function useClaims(bountyAddress: Address | undefined) {
  // Demo mode - return mock claims
  if (DEMO_MODE && bountyAddress) {
    const mockClaims = MOCK_CLAIMS[bountyAddress] || [];
    return {
      claims: mockClaims.map((c) => ({
        ...c,
        proof: {
          description: `Proof for ${c.name}`,
          imageUrl: `https://picsum.photos/seed/${c.id}/400/300`,
        },
      })),
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }

  // First get the claims count
  const { data: claimsCount } = useReadContract({
    address: bountyAddress,
    abi: POIDH_ABI,
    functionName: "getClaimsCount",
    chainId: base.id,
    query: { enabled: !!bountyAddress },
  });

  const count = claimsCount ? Number(claimsCount) : 0;

  // Create contract reads for each claim
  const contracts = Array.from({ length: count }, (_, i) => ({
    address: bountyAddress!,
    abi: POIDH_ABI,
    functionName: "getClaim" as const,
    args: [BigInt(i)],
    chainId: base.id,
  }));

  const { data: claimsData, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!bountyAddress && count > 0,
    },
  });

  // Parse claims
  const claims: ClaimData[] = [];
  if (claimsData) {
    for (let i = 0; i < claimsData.length; i++) {
      const result = claimsData[i]?.result as [Address, string, string] | undefined;
      if (result) {
        claims.push({
          id: i,
          claimant: result[0],
          name: result[1],
          proofURI: result[2],
        });
      }
    }
  }

  // Fetch proof metadata from IPFS
  const { data: proofMap, isLoading: isLoadingProofs } = useQuery({
    queryKey: ["claims-proof", claims.map((c) => c.proofURI)],
    queryFn: async () => {
      const map = new Map<string, { description?: string; imageUrl?: string; externalUrl?: string } | null>();
      await Promise.all(
        claims.map(async (claim) => {
          if (claim.proofURI) {
            try {
              const proof = await fetchFromIPFS<{
                description?: string;
                imageUrl?: string;
                externalUrl?: string;
              }>(claim.proofURI);
              map.set(claim.proofURI, proof);
            } catch {
              map.set(claim.proofURI, null);
            }
          }
        })
      );
      return map;
    },
    enabled: claims.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Merge proof metadata into claims
  const claimsWithProof = claims.map((claim) => ({
    ...claim,
    proof: proofMap?.get(claim.proofURI) ?? null,
  }));

  return {
    claims: claimsWithProof,
    isLoading: isLoading || isLoadingProofs,
    error,
    refetch,
  };
}

/**
 * Fetch a single claim by ID
 */
export function useClaim(bountyAddress: Address | undefined, claimId: number | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: bountyAddress,
    abi: POIDH_ABI,
    functionName: "getClaim",
    args: claimId !== undefined ? [BigInt(claimId)] : undefined,
    chainId: base.id,
    query: { enabled: !!bountyAddress && claimId !== undefined },
  });

  const claim = data
    ? {
        id: claimId!,
        claimant: (data as [Address, string, string])[0],
        name: (data as [Address, string, string])[1],
        proofURI: (data as [Address, string, string])[2],
      }
    : null;

  // Fetch proof metadata
  const { data: proof } = useQuery({
    queryKey: ["claim-proof", claim?.proofURI],
    queryFn: () =>
      fetchFromIPFS<{
        description?: string;
        imageUrl?: string;
        externalUrl?: string;
      }>(claim!.proofURI),
    enabled: !!claim?.proofURI,
    staleTime: 5 * 60 * 1000,
  });

  return {
    claim: claim
      ? {
          ...claim,
          proof,
        }
      : null,
    isLoading,
    error,
  };
}

/**
 * Hook for current vote state
 */
export function useVoteState(bountyAddress: Address | undefined) {
  // Demo mode - return mock vote state for voting bounties
  if (DEMO_MODE && bountyAddress) {
    const bountyNum = parseInt(bountyAddress.slice(2, 6), 16);
    // Bounty 2 and 10 are in VOTING state
    if (bountyNum === 2) {
      // 2 days from now deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60);
      return {
        voteState: {
          claimId: 0n, // Voting on first claim
          yes: 1500000000000000000n, // 1.5 ETH yes
          no: 350000000000000000n, // 0.35 ETH no
          deadline,
          votingRound: 1n,
        },
        isLoading: false,
        error: null,
        refetch: () => {},
      };
    }
    if (bountyNum === 10) {
      // 12 hours from now deadline
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 12 * 60 * 60);
      return {
        voteState: {
          claimId: 1n, // Voting on second claim
          yes: 500000000000000000n, // 0.5 ETH yes
          no: 200000000000000000n, // 0.2 ETH no
          deadline,
          votingRound: 1n,
        },
        isLoading: false,
        error: null,
        refetch: () => {},
      };
    }
    return {
      voteState: null,
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }

  const { data, isLoading, error, refetch } = useReadContract({
    address: bountyAddress,
    abi: POIDH_ABI,
    functionName: "currentVote",
    chainId: base.id,
    query: {
      enabled: !!bountyAddress && !DEMO_MODE,
      refetchInterval: 5000, // Refresh every 5 seconds during voting
    },
  });

  const voteState = data
    ? {
        claimId: (data as [bigint, bigint, bigint, bigint, bigint])[0],
        yes: (data as [bigint, bigint, bigint, bigint, bigint])[1],
        no: (data as [bigint, bigint, bigint, bigint, bigint])[2],
        deadline: (data as [bigint, bigint, bigint, bigint, bigint])[3],
        votingRound: (data as [bigint, bigint, bigint, bigint, bigint])[4],
      }
    : null;

  return {
    voteState,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check which bounties a user has claimed on
 */
export function useUserClaimedBounties(
  bounties: BountyData[],
  userAddress: Address | undefined
) {
  // Demo mode - check mock claims
  if (DEMO_MODE && userAddress) {
    const userClaimedBounties = new Set<string>();
    for (const bounty of bounties) {
      const claims = MOCK_CLAIMS[bounty.address] || [];
      for (const claim of claims) {
        if (claim.claimant.toLowerCase() === userAddress.toLowerCase()) {
          userClaimedBounties.add(bounty.address.toLowerCase());
          break;
        }
      }
    }
    return { userClaimedBounties, isLoading: false };
  }

  // For each bounty with claims, we need to check each claim to see if user is the claimant
  // Build contract calls to fetch all claims from all bounties
  const contracts = bounties.flatMap((bounty) => {
    const count = Number(bounty.claimsCount);
    return Array.from({ length: count }, (_, i) => ({
      address: bounty.address,
      abi: POIDH_ABI,
      functionName: "getClaim" as const,
      args: [BigInt(i)],
      chainId: base.id,
    }));
  });

  const { data: claimsData, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0 && !!userAddress,
    },
  });

  // Build a set of bounty addresses where user has claimed
  const userClaimedBounties = new Set<string>();

  if (claimsData && userAddress) {
    let claimIndex = 0;
    for (const bounty of bounties) {
      const count = Number(bounty.claimsCount);
      for (let i = 0; i < count; i++) {
        const result = claimsData[claimIndex]?.result as [Address, string, string] | undefined;
        if (result && result[0].toLowerCase() === userAddress.toLowerCase()) {
          userClaimedBounties.add(bounty.address.toLowerCase());
        }
        claimIndex++;
      }
    }
  }

  return {
    userClaimedBounties,
    isLoading,
  };
}
