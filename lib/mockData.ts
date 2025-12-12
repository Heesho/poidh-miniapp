import type { Address } from "viem";
import { BountyState } from "./contracts";
import type { BountyData } from "@/hooks/useBounties";
import type { ActivityItem, ActivityType } from "@/hooks/useActivityFeed";
import type { ClaimData } from "@/hooks/useClaims";

// Demo mode flag - set to true to use mock data
export const DEMO_MODE = true;

// Demo user address - used when wallet is "connected" in demo mode
// This user should have bounties in all filter categories (created, joined, claimed)
export const DEMO_USER_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as Address; // Alice

// Mock user addresses
const MOCK_ADDRESSES = {
  alice: "0x1234567890abcdef1234567890abcdef12345678" as Address,
  bob: "0x2345678901abcdef2345678901abcdef23456789" as Address,
  charlie: "0x3456789012abcdef3456789012abcdef34567890" as Address,
  diana: "0x4567890123abcdef4567890123abcdef45678901" as Address,
  evan: "0x5678901234abcdef5678901234abcdef56789012" as Address,
  fiona: "0x6789012345abcdef6789012345abcdef67890123" as Address,
  george: "0x7890123456abcdef7890123456abcdef78901234" as Address,
  hannah: "0x8901234567abcdef8901234567abcdef89012345" as Address,
};

// Mock Farcaster profiles
export const MOCK_PROFILES: Record<string, { fid: number; username: string; displayName: string; pfpUrl: string }> = {
  [MOCK_ADDRESSES.alice.toLowerCase()]: {
    fid: 1001,
    username: "alice.eth",
    displayName: "Alice",
    pfpUrl: "https://i.pravatar.cc/150?u=alice",
  },
  [MOCK_ADDRESSES.bob.toLowerCase()]: {
    fid: 1002,
    username: "bobthebuilder",
    displayName: "Bob Builder",
    pfpUrl: "https://i.pravatar.cc/150?u=bob",
  },
  [MOCK_ADDRESSES.charlie.toLowerCase()]: {
    fid: 1003,
    username: "charlie",
    displayName: "Charlie",
    pfpUrl: "https://i.pravatar.cc/150?u=charlie",
  },
  [MOCK_ADDRESSES.diana.toLowerCase()]: {
    fid: 1004,
    username: "diana.base",
    displayName: "Diana",
    pfpUrl: "https://i.pravatar.cc/150?u=diana",
  },
  [MOCK_ADDRESSES.evan.toLowerCase()]: {
    fid: 1005,
    username: "evan_codes",
    displayName: "Evan",
    pfpUrl: "https://i.pravatar.cc/150?u=evan",
  },
  [MOCK_ADDRESSES.fiona.toLowerCase()]: {
    fid: 1006,
    username: "fiona",
    displayName: "Fiona",
    pfpUrl: "https://i.pravatar.cc/150?u=fiona",
  },
  [MOCK_ADDRESSES.george.toLowerCase()]: {
    fid: 1007,
    username: "george.degen",
    displayName: "George",
    pfpUrl: "https://i.pravatar.cc/150?u=george",
  },
  [MOCK_ADDRESSES.hannah.toLowerCase()]: {
    fid: 1008,
    username: "hannah_web3",
    displayName: "Hannah",
    pfpUrl: "https://i.pravatar.cc/150?u=hannah",
  },
};

// Helper to generate mock bounty addresses
const mockBountyAddr = (id: number): Address =>
  `0x${id.toString(16).padStart(4, '0')}${"0".repeat(36)}` as Address;

// Current timestamp helpers
const now = Math.floor(Date.now() / 1000);
const hoursAgo = (h: number) => now - h * 3600;
const daysAgo = (d: number) => now - d * 86400;

// Mock bounties
export const MOCK_BOUNTIES: BountyData[] = [
  {
    address: mockBountyAddr(1),
    issuer: MOCK_ADDRESSES.alice,
    metadataURI: "ipfs://mock1",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 500000000000000000n, // 0.5 ETH
    claimsCount: 3n,
    metadata: {
      title: "Best photo of NYC skyline at sunset",
      description: "Looking for an amazing photo of the New York City skyline during golden hour. Must be original and high resolution. Bonus points for including the Statue of Liberty!",
    },
  },
  {
    address: mockBountyAddr(2),
    issuer: MOCK_ADDRESSES.bob,
    metadataURI: "ipfs://mock2",
    state: BountyState.VOTING,
    joinable: true,
    totalStaked: 2200000000000000000n, // 2.2 ETH (including Alice's 0.1)
    claimsCount: 5n,
    metadata: {
      title: "Prove you completed a mass",
      description: "Complete a mass today and submit proof. Photo or video evidence required showing you attended the full service.",
    },
  },
  {
    address: mockBountyAddr(3),
    issuer: MOCK_ADDRESSES.charlie,
    metadataURI: "ipfs://mock3",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 750000000000000000n, // 0.75 ETH
    claimsCount: 1n,
    metadata: {
      title: "Run 5K in under 25 minutes",
      description: "Submit proof of running 5 kilometers in under 25 minutes. Screenshot from Strava, Nike Run Club, or similar app with timestamp required.",
    },
  },
  {
    address: mockBountyAddr(4),
    issuer: MOCK_ADDRESSES.diana,
    metadataURI: "ipfs://mock4",
    state: BountyState.CLOSED,
    joinable: false,
    totalStaked: 1000000000000000000n, // 1 ETH
    claimsCount: 2n,
    metadata: {
      title: "Find the hidden QR code in Central Park",
      description: "There's a QR code hidden somewhere in Central Park. Find it and scan it for proof. The QR code links to a specific URL that will verify your discovery.",
    },
  },
  {
    address: mockBountyAddr(5),
    issuer: MOCK_ADDRESSES.evan,
    metadataURI: "ipfs://mock5",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 3500000000000000000n, // 3.5 ETH
    claimsCount: 8n,
    metadata: {
      title: "Create a viral TikTok about Base",
      description: "Create a TikTok video explaining Base blockchain to beginners. Must get at least 10K views within 48 hours of posting. Submit link to video as proof.",
    },
  },
  {
    address: mockBountyAddr(6),
    issuer: MOCK_ADDRESSES.fiona,
    metadataURI: "ipfs://mock6",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 250000000000000000n, // 0.25 ETH
    claimsCount: 0n,
    metadata: {
      title: "Best latte art photo",
      description: "Show off your latte art skills! Submit a photo of your best latte art creation. Must be made by you today.",
    },
  },
  {
    address: mockBountyAddr(7),
    issuer: MOCK_ADDRESSES.george,
    metadataURI: "ipfs://mock7",
    state: BountyState.CANCELLED,
    joinable: true,
    totalStaked: 500000000000000000n, // 0.5 ETH (funds not yet withdrawn)
    claimsCount: 0n,
    metadata: {
      title: "Cancelled bounty example",
      description: "This bounty was cancelled by the creator. Funders can withdraw their stake.",
    },
  },
  {
    address: mockBountyAddr(8),
    issuer: MOCK_ADDRESSES.hannah,
    metadataURI: "ipfs://mock8",
    state: BountyState.OPEN,
    joinable: false,
    totalStaked: 5000000000000000000n, // 5 ETH
    claimsCount: 12n,
    metadata: {
      title: "Ship a feature to production today",
      description: "Deploy a new feature to a production app today. Submit screenshot of the PR merged and deployed. Must include timestamp.",
    },
  },
  {
    address: mockBountyAddr(9),
    issuer: MOCK_ADDRESSES.alice,
    metadataURI: "ipfs://mock9",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 150000000000000000n, // 0.15 ETH
    claimsCount: 2n,
    metadata: {
      title: "Cook a meal with 5+ ingredients",
      description: "Cook a meal using at least 5 different ingredients. Submit a photo of the final dish and list the ingredients used.",
    },
  },
  {
    address: mockBountyAddr(10),
    issuer: MOCK_ADDRESSES.bob,
    metadataURI: "ipfs://mock10",
    state: BountyState.VOTING,
    joinable: true,
    totalStaked: 800000000000000000n, // 0.8 ETH
    claimsCount: 4n,
    metadata: {
      title: "Pet a stranger's dog (with permission)",
      description: "Ask a stranger if you can pet their dog, and submit photo proof of you petting the dog. Must show the dog owner gave permission.",
    },
  },
  {
    address: mockBountyAddr(11),
    issuer: MOCK_ADDRESSES.charlie,
    metadataURI: "ipfs://mock11",
    state: BountyState.CLOSED,
    joinable: true,
    totalStaked: 1200000000000000000n, // 1.2 ETH
    claimsCount: 6n,
    metadata: {
      title: "Do 100 pushups in one session",
      description: "Complete 100 pushups in a single session. Video proof required showing continuous count or timestamp verification.",
    },
  },
  {
    address: mockBountyAddr(12),
    issuer: MOCK_ADDRESSES.diana,
    metadataURI: "ipfs://mock12",
    state: BountyState.OPEN,
    joinable: true,
    totalStaked: 420000000000000000n, // 0.42 ETH
    claimsCount: 3n,
    metadata: {
      title: "Write a haiku about Ethereum",
      description: "Write an original haiku (5-7-5 syllable structure) about Ethereum or blockchain. Submit as text proof.",
    },
  },
];

// Mock funders for each bounty (address -> stake amount in wei)
export type FunderData = {
  address: Address;
  amount: bigint;
};

export const MOCK_FUNDERS: Record<string, FunderData[]> = {
  [mockBountyAddr(1)]: [
    { address: MOCK_ADDRESSES.alice, amount: 300000000000000000n }, // 0.3 ETH (issuer)
    { address: MOCK_ADDRESSES.hannah, amount: 100000000000000000n }, // 0.1 ETH
    { address: MOCK_ADDRESSES.evan, amount: 100000000000000000n }, // 0.1 ETH
  ],
  [mockBountyAddr(2)]: [
    { address: MOCK_ADDRESSES.bob, amount: 1000000000000000000n }, // 1 ETH (issuer)
    { address: MOCK_ADDRESSES.charlie, amount: 500000000000000000n }, // 0.5 ETH
    { address: MOCK_ADDRESSES.diana, amount: 350000000000000000n }, // 0.35 ETH
    { address: MOCK_ADDRESSES.fiona, amount: 250000000000000000n }, // 0.25 ETH
    { address: MOCK_ADDRESSES.alice, amount: 100000000000000000n }, // 0.1 ETH (joined)
  ],
  [mockBountyAddr(3)]: [
    { address: MOCK_ADDRESSES.charlie, amount: 500000000000000000n }, // 0.5 ETH (issuer)
    { address: MOCK_ADDRESSES.alice, amount: 250000000000000000n }, // 0.25 ETH
  ],
  [mockBountyAddr(5)]: [
    { address: MOCK_ADDRESSES.evan, amount: 2000000000000000000n }, // 2 ETH (issuer)
    { address: MOCK_ADDRESSES.charlie, amount: 500000000000000000n }, // 0.5 ETH
    { address: MOCK_ADDRESSES.bob, amount: 500000000000000000n }, // 0.5 ETH
    { address: MOCK_ADDRESSES.hannah, amount: 300000000000000000n }, // 0.3 ETH
    { address: MOCK_ADDRESSES.diana, amount: 200000000000000000n }, // 0.2 ETH
  ],
  [mockBountyAddr(6)]: [
    { address: MOCK_ADDRESSES.fiona, amount: 250000000000000000n }, // 0.25 ETH (issuer, solo)
  ],
  [mockBountyAddr(7)]: [
    { address: MOCK_ADDRESSES.george, amount: 300000000000000000n }, // 0.3 ETH (issuer)
    { address: MOCK_ADDRESSES.alice, amount: 200000000000000000n }, // 0.2 ETH (joined, can withdraw)
  ],
  [mockBountyAddr(8)]: [
    { address: MOCK_ADDRESSES.hannah, amount: 2000000000000000000n }, // 2 ETH (issuer)
    { address: MOCK_ADDRESSES.alice, amount: 1000000000000000000n }, // 1 ETH
    { address: MOCK_ADDRESSES.bob, amount: 750000000000000000n }, // 0.75 ETH
    { address: MOCK_ADDRESSES.charlie, amount: 500000000000000000n }, // 0.5 ETH
    { address: MOCK_ADDRESSES.diana, amount: 400000000000000000n }, // 0.4 ETH
    { address: MOCK_ADDRESSES.evan, amount: 200000000000000000n }, // 0.2 ETH
    { address: MOCK_ADDRESSES.fiona, amount: 150000000000000000n }, // 0.15 ETH
  ],
  [mockBountyAddr(9)]: [
    { address: MOCK_ADDRESSES.alice, amount: 150000000000000000n }, // 0.15 ETH (issuer, solo)
  ],
  [mockBountyAddr(10)]: [
    { address: MOCK_ADDRESSES.bob, amount: 500000000000000000n }, // 0.5 ETH (issuer)
    { address: MOCK_ADDRESSES.george, amount: 200000000000000000n }, // 0.2 ETH
    { address: MOCK_ADDRESSES.fiona, amount: 100000000000000000n }, // 0.1 ETH
  ],
  [mockBountyAddr(12)]: [
    { address: MOCK_ADDRESSES.diana, amount: 200000000000000000n }, // 0.2 ETH (issuer)
    { address: MOCK_ADDRESSES.alice, amount: 80000000000000000n }, // 0.08 ETH
    { address: MOCK_ADDRESSES.bob, amount: 50000000000000000n }, // 0.05 ETH
    { address: MOCK_ADDRESSES.charlie, amount: 40000000000000000n }, // 0.04 ETH
    { address: MOCK_ADDRESSES.evan, amount: 30000000000000000n }, // 0.03 ETH
    { address: MOCK_ADDRESSES.george, amount: 20000000000000000n }, // 0.02 ETH
  ],
};

// Mock claims for each bounty
export const MOCK_CLAIMS: Record<string, ClaimData[]> = {
  [mockBountyAddr(1)]: [
    { id: 0, claimant: MOCK_ADDRESSES.bob, name: "Sunset from Brooklyn Bridge", proofURI: "ipfs://claim1" },
    { id: 1, claimant: MOCK_ADDRESSES.charlie, name: "Golden hour from Top of the Rock", proofURI: "ipfs://claim2" },
    { id: 2, claimant: MOCK_ADDRESSES.diana, name: "Statue of Liberty at dusk", proofURI: "ipfs://claim3" },
  ],
  [mockBountyAddr(2)]: [
    { id: 0, claimant: MOCK_ADDRESSES.alice, name: "St. Patrick's Cathedral Mass", proofURI: "ipfs://claim4" },
    { id: 1, claimant: MOCK_ADDRESSES.evan, name: "Sunday service at local church", proofURI: "ipfs://claim5" },
    { id: 2, claimant: MOCK_ADDRESSES.fiona, name: "Morning mass proof", proofURI: "ipfs://claim6" },
    { id: 3, claimant: MOCK_ADDRESSES.george, name: "Cathedral basilica attendance", proofURI: "ipfs://claim7" },
    { id: 4, claimant: MOCK_ADDRESSES.hannah, name: "Christmas mass photo", proofURI: "ipfs://claim8" },
  ],
  [mockBountyAddr(3)]: [
    { id: 0, claimant: MOCK_ADDRESSES.evan, name: "Strava 5K - 23:45", proofURI: "ipfs://claim9" },
  ],
  [mockBountyAddr(5)]: [
    { id: 0, claimant: MOCK_ADDRESSES.alice, name: "Base explained in 60 seconds", proofURI: "ipfs://claim10" },
    { id: 1, claimant: MOCK_ADDRESSES.bob, name: "Why Base is the future", proofURI: "ipfs://claim11" },
    { id: 2, claimant: MOCK_ADDRESSES.fiona, name: "Base for beginners TikTok", proofURI: "ipfs://claim12" },
    { id: 3, claimant: MOCK_ADDRESSES.george, name: "My Base journey video", proofURI: "ipfs://claim13" },
    { id: 4, claimant: MOCK_ADDRESSES.hannah, name: "Base onboarding tutorial", proofURI: "ipfs://claim14" },
    { id: 5, claimant: MOCK_ADDRESSES.charlie, name: "Crypto made simple: Base", proofURI: "ipfs://claim15" },
    { id: 6, claimant: MOCK_ADDRESSES.diana, name: "Base blockchain explainer", proofURI: "ipfs://claim16" },
    { id: 7, claimant: MOCK_ADDRESSES.evan, name: "30 sec Base pitch", proofURI: "ipfs://claim17" },
  ],
  [mockBountyAddr(10)]: [
    { id: 0, claimant: MOCK_ADDRESSES.alice, name: "Met a golden retriever at the park", proofURI: "ipfs://claim18" },
    { id: 1, claimant: MOCK_ADDRESSES.charlie, name: "Petting a husky on my walk", proofURI: "ipfs://claim19" },
    { id: 2, claimant: MOCK_ADDRESSES.diana, name: "Friendly corgi at the coffee shop", proofURI: "ipfs://claim20" },
    { id: 3, claimant: MOCK_ADDRESSES.evan, name: "Made a new puppy friend", proofURI: "ipfs://claim21" },
  ],
  [mockBountyAddr(4)]: [
    { id: 0, claimant: MOCK_ADDRESSES.alice, name: "Found it near the fountain!", proofURI: "ipfs://claim22" },
    { id: 1, claimant: MOCK_ADDRESSES.bob, name: "QR code by the bridge", proofURI: "ipfs://claim23" },
  ],
  [mockBountyAddr(11)]: [
    { id: 0, claimant: MOCK_ADDRESSES.alice, name: "100 pushups video proof", proofURI: "ipfs://claim24" },
    { id: 1, claimant: MOCK_ADDRESSES.bob, name: "My 100 pushup challenge", proofURI: "ipfs://claim25" },
    { id: 2, claimant: MOCK_ADDRESSES.charlie, name: "100 pushups complete!", proofURI: "ipfs://claim26" },
    { id: 3, claimant: MOCK_ADDRESSES.diana, name: "Pushup challenge done", proofURI: "ipfs://claim27" },
    { id: 4, claimant: MOCK_ADDRESSES.evan, name: "100 pushups no breaks", proofURI: "ipfs://claim28" },
    { id: 5, claimant: MOCK_ADDRESSES.fiona, name: "Finally did 100!", proofURI: "ipfs://claim29" },
  ],
};

// Mock winning claim for closed bounties (bounty address -> winning claim id)
export const MOCK_WINNERS: Record<string, number> = {
  [mockBountyAddr(4)]: 1, // Bob won with "QR code by the bridge"
  [mockBountyAddr(11)]: 2, // Charlie won with "100 pushups complete!"
};

// Mock user votes - tracks which users have voted and how
// Key: `${bountyAddress.toLowerCase()}-${userAddress.toLowerCase()}`
// Value: true = voted yes, false = voted no
export const MOCK_USER_VOTES: Record<string, boolean> = {
  // Bounty 2 (voting): Some users have already voted
  [`${mockBountyAddr(2).toLowerCase()}-${MOCK_ADDRESSES.charlie.toLowerCase()}`]: true,
  [`${mockBountyAddr(2).toLowerCase()}-${MOCK_ADDRESSES.diana.toLowerCase()}`]: false,
  // Alice hasn't voted yet on bounty 2, so she can vote
  // Bounty 10 (voting): Some users have voted
  [`${mockBountyAddr(10).toLowerCase()}-${MOCK_ADDRESSES.george.toLowerCase()}`]: false,
};

// Mock activity feed
export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "bounty_created",
    timestamp: hoursAgo(0.5),
    blockNumber: 1000n,
    transactionHash: "0xabc1",
    bountyAddress: mockBountyAddr(12),
    data: { user: MOCK_ADDRESSES.diana },
  },
  {
    id: "act-2",
    type: "claim_submitted",
    timestamp: hoursAgo(1),
    blockNumber: 999n,
    transactionHash: "0xabc2",
    bountyAddress: mockBountyAddr(5),
    data: { claimant: MOCK_ADDRESSES.evan, claimName: "30 sec Base pitch" },
  },
  {
    id: "act-3",
    type: "bounty_joined",
    timestamp: hoursAgo(1.5),
    blockNumber: 998n,
    transactionHash: "0xabc3",
    bountyAddress: mockBountyAddr(5),
    data: { user: MOCK_ADDRESSES.charlie, amount: "0.5" },
  },
  {
    id: "act-4",
    type: "vote_started",
    timestamp: hoursAgo(2),
    blockNumber: 997n,
    transactionHash: "0xabc4",
    bountyAddress: mockBountyAddr(2),
    data: { claimId: 0n },
  },
  {
    id: "act-5",
    type: "vote_cast",
    timestamp: hoursAgo(2.5),
    blockNumber: 996n,
    transactionHash: "0xabc5",
    bountyAddress: mockBountyAddr(2),
    data: { user: MOCK_ADDRESSES.fiona, support: true },
  },
  {
    id: "act-6",
    type: "claim_submitted",
    timestamp: hoursAgo(3),
    blockNumber: 995n,
    transactionHash: "0xabc6",
    bountyAddress: mockBountyAddr(1),
    data: { claimant: MOCK_ADDRESSES.diana, claimName: "Statue of Liberty at dusk" },
  },
  {
    id: "act-7",
    type: "bounty_paid",
    timestamp: hoursAgo(4),
    blockNumber: 994n,
    transactionHash: "0xabc7",
    bountyAddress: mockBountyAddr(4),
    data: { winner: MOCK_ADDRESSES.bob, reward: "1.0" },
  },
  {
    id: "act-8",
    type: "bounty_joined",
    timestamp: hoursAgo(5),
    blockNumber: 993n,
    transactionHash: "0xabc8",
    bountyAddress: mockBountyAddr(8),
    data: { user: MOCK_ADDRESSES.alice, amount: "1.0" },
  },
  {
    id: "act-9",
    type: "bounty_created",
    timestamp: hoursAgo(6),
    blockNumber: 992n,
    transactionHash: "0xabc9",
    bountyAddress: mockBountyAddr(8),
    data: { user: MOCK_ADDRESSES.hannah },
  },
  {
    id: "act-10",
    type: "claim_submitted",
    timestamp: hoursAgo(7),
    blockNumber: 991n,
    transactionHash: "0xabc10",
    bountyAddress: mockBountyAddr(3),
    data: { claimant: MOCK_ADDRESSES.evan, claimName: "Strava 5K - 23:45" },
  },
  {
    id: "act-11",
    type: "vote_cast",
    timestamp: hoursAgo(8),
    blockNumber: 990n,
    transactionHash: "0xabc11",
    bountyAddress: mockBountyAddr(10),
    data: { user: MOCK_ADDRESSES.george, support: false },
  },
  {
    id: "act-12",
    type: "bounty_cancelled",
    timestamp: daysAgo(1),
    blockNumber: 989n,
    transactionHash: "0xabc12",
    bountyAddress: mockBountyAddr(7),
    data: {},
  },
  {
    id: "act-13",
    type: "bounty_paid",
    timestamp: daysAgo(1.5),
    blockNumber: 988n,
    transactionHash: "0xabc13",
    bountyAddress: mockBountyAddr(11),
    data: { winner: MOCK_ADDRESSES.charlie, reward: "1.2" },
  },
  {
    id: "act-14",
    type: "bounty_joined",
    timestamp: daysAgo(2),
    blockNumber: 987n,
    transactionHash: "0xabc14",
    bountyAddress: mockBountyAddr(1),
    data: { user: MOCK_ADDRESSES.hannah, amount: "0.1" },
  },
  {
    id: "act-15",
    type: "claim_submitted",
    timestamp: daysAgo(2.5),
    blockNumber: 986n,
    transactionHash: "0xabc15",
    bountyAddress: mockBountyAddr(9),
    data: { claimant: MOCK_ADDRESSES.fiona, claimName: "Homemade pasta dinner" },
  },
];

// Helper to get mock profile by address
export function getMockProfile(address: string) {
  return MOCK_PROFILES[address.toLowerCase()] || null;
}

// Helper to get user's vote for a bounty (returns undefined if not voted)
export function getMockUserVote(bountyAddress: string, userAddress: string): boolean | undefined {
  const key = `${bountyAddress.toLowerCase()}-${userAddress.toLowerCase()}`;
  if (key in MOCK_USER_VOTES) {
    return MOCK_USER_VOTES[key];
  }
  return undefined;
}

// Calculate mock stats
export function getMockStats() {
  const totalStaked = MOCK_BOUNTIES.reduce((sum, b) => sum + b.totalStaked, 0n);
  const openBounties = MOCK_BOUNTIES.filter(b => b.state === BountyState.OPEN).length;
  const rewardsPaid = MOCK_BOUNTIES
    .filter(b => b.state === BountyState.CLOSED)
    .reduce((sum, b) => sum + b.totalStaked, 0n);

  return {
    totalStaked,
    openBounties,
    rewardsPaid,
    totalCount: MOCK_BOUNTIES.length,
  };
}
