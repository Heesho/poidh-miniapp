import { useState, useEffect } from "react";
import type { Address } from "viem";
import { DEMO_MODE, MOCK_FUNDERS, type FunderData } from "@/lib/mockData";
import type { BountyData } from "./useBounties";

export function useFunders(bountyAddress: Address | undefined) {
  const [funders, setFunders] = useState<FunderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!bountyAddress) {
      setFunders([]);
      setIsLoading(false);
      return;
    }

    if (DEMO_MODE) {
      const mockFunders = MOCK_FUNDERS[bountyAddress] || [];
      setFunders(mockFunders);
      setIsLoading(false);
      return;
    }

    // In production, would fetch from events or subgraph
    // For now, just return empty
    setFunders([]);
    setIsLoading(false);
  }, [bountyAddress]);

  return { funders, isLoading };
}

/**
 * Hook to check which bounties a user has joined (staked in but is not the issuer)
 */
export function useUserJoinedBounties(
  bounties: BountyData[],
  userAddress: Address | undefined
) {
  // Demo mode - check mock funders
  if (DEMO_MODE && userAddress) {
    const userJoinedBounties = new Set<string>();
    for (const bounty of bounties) {
      const funders = MOCK_FUNDERS[bounty.address] || [];
      for (const funder of funders) {
        // User is a funder but NOT the issuer
        if (
          funder.address.toLowerCase() === userAddress.toLowerCase() &&
          bounty.issuer.toLowerCase() !== userAddress.toLowerCase()
        ) {
          userJoinedBounties.add(bounty.address.toLowerCase());
          break;
        }
      }
    }
    return { userJoinedBounties, isLoading: false };
  }

  // In production, would need to check on-chain stakes
  return { userJoinedBounties: new Set<string>(), isLoading: false };
}
