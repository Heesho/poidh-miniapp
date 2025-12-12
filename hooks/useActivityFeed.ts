import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { base } from "wagmi/chains";
import { parseAbiItem, type Address, formatEther } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { DEMO_MODE, MOCK_ACTIVITIES } from "@/lib/mockData";

export type ActivityType =
  | "bounty_created"
  | "bounty_joined"
  | "claim_submitted"
  | "vote_started"
  | "vote_cast"
  | "bounty_paid"
  | "bounty_cancelled";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  timestamp: number;
  blockNumber: bigint;
  transactionHash: string;
  bountyAddress: Address;
  data: {
    user?: Address;
    amount?: string;
    claimId?: bigint;
    claimant?: Address;
    claimName?: string;
    winner?: Address;
    reward?: string;
    support?: boolean;
    metadataURI?: string;
  };
};

// Event signatures
const BOUNTY_CREATED_EVENT = parseAbiItem(
  "event PoidhFactory__BountyCreated(address indexed bountyAddress, address indexed issuer, string metadataURI, bool joinable, uint256 index)"
);

const JOINED_EVENT = parseAbiItem(
  "event Poidh__Joined(address indexed user, uint256 amount)"
);

const CLAIM_SUBMITTED_EVENT = parseAbiItem(
  "event Poidh__ClaimSubmitted(uint256 indexed claimId, address indexed claimant, string name, string proofURI)"
);

const VOTE_STARTED_EVENT = parseAbiItem(
  "event Poidh__VoteStarted(uint256 indexed claimId, uint256 deadline, uint256 round)"
);

const VOTE_CAST_EVENT = parseAbiItem(
  "event Poidh__VoteCast(address indexed voter, bool support, uint256 weight)"
);

const BOUNTY_PAID_EVENT = parseAbiItem(
  "event Poidh__BountyPaid(address indexed winner, uint256 reward, uint256 fee)"
);

const CANCELLED_EVENT = parseAbiItem("event Poidh__Cancelled()");

export function useActivityFeed(limit: number = 20) {
  const publicClient = usePublicClient({ chainId: base.id });

  // Initialize with mock data if in demo mode
  const [activities, setActivities] = useState<ActivityItem[]>(
    DEMO_MODE ? MOCK_ACTIVITIES.slice(0, limit) : []
  );
  const [isLoading, setIsLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Demo mode - already initialized with mock data
    if (DEMO_MODE) {
      return;
    }

    if (!publicClient) return;

    let cancelled = false;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current block
        const currentBlock = await publicClient.getBlockNumber();
        // Look back ~1 day worth of blocks (Base has ~2s blocks, so ~43200 blocks/day)
        // Start with smaller range for performance
        const fromBlock = currentBlock - 10000n;

        const allActivities: ActivityItem[] = [];

        // Fetch bounty created events from factory
        const createdLogs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.factory as Address,
          event: BOUNTY_CREATED_EVENT,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of createdLogs) {
          if (cancelled) return;
          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber,
          });
          allActivities.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            type: "bounty_created",
            timestamp: Number(block.timestamp),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            bountyAddress: log.args.bountyAddress as Address,
            data: {
              user: log.args.issuer as Address,
              metadataURI: log.args.metadataURI as string,
            },
          });
        }

        // Get all bounty addresses to query their events
        const bountyAddresses = [
          ...new Set(createdLogs.map((l) => l.args.bountyAddress as Address)),
        ];

        // For each bounty, fetch its events
        for (const bountyAddress of bountyAddresses) {
          if (cancelled) return;

          // Joined events
          try {
            const joinedLogs = await publicClient.getLogs({
              address: bountyAddress,
              event: JOINED_EVENT,
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of joinedLogs) {
              if (cancelled) return;
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });
              allActivities.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "bounty_joined",
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                bountyAddress,
                data: {
                  user: log.args.user as Address,
                  amount: formatEther(log.args.amount as bigint),
                },
              });
            }
          } catch {
            // Bounty might not exist yet or other error
          }

          // Claim submitted events
          try {
            const claimLogs = await publicClient.getLogs({
              address: bountyAddress,
              event: CLAIM_SUBMITTED_EVENT,
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of claimLogs) {
              if (cancelled) return;
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });
              allActivities.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "claim_submitted",
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                bountyAddress,
                data: {
                  claimId: log.args.claimId as bigint,
                  claimant: log.args.claimant as Address,
                  claimName: log.args.name as string,
                },
              });
            }
          } catch {
            // Ignore errors
          }

          // Vote started events
          try {
            const voteStartedLogs = await publicClient.getLogs({
              address: bountyAddress,
              event: VOTE_STARTED_EVENT,
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of voteStartedLogs) {
              if (cancelled) return;
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });
              allActivities.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "vote_started",
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                bountyAddress,
                data: {
                  claimId: log.args.claimId as bigint,
                },
              });
            }
          } catch {
            // Ignore errors
          }

          // Bounty paid events
          try {
            const paidLogs = await publicClient.getLogs({
              address: bountyAddress,
              event: BOUNTY_PAID_EVENT,
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of paidLogs) {
              if (cancelled) return;
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });
              allActivities.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "bounty_paid",
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                bountyAddress,
                data: {
                  winner: log.args.winner as Address,
                  reward: formatEther(log.args.reward as bigint),
                },
              });
            }
          } catch {
            // Ignore errors
          }

          // Cancelled events
          try {
            const cancelledLogs = await publicClient.getLogs({
              address: bountyAddress,
              event: CANCELLED_EVENT,
              fromBlock,
              toBlock: currentBlock,
            });

            for (const log of cancelledLogs) {
              if (cancelled) return;
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });
              allActivities.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: "bounty_cancelled",
                timestamp: Number(block.timestamp),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                bountyAddress,
                data: {},
              });
            }
          } catch {
            // Ignore errors
          }
        }

        // Sort by timestamp descending and limit
        const sorted = allActivities
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);

        if (!cancelled) {
          setActivities(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch activity"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [publicClient, limit]);

  return { activities, isLoading, error };
}
