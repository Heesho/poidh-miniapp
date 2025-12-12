import type { Address } from "viem";

export const CONTRACT_ADDRESSES = {
  factory: "0x2B31F6E90D0E0e1f3814a3B9d76a9f4cE3b2E6c0" as Address,
} as const;

export enum BountyState {
  OPEN = 0,
  VOTING = 1,
  CLOSED = 2,
  CANCELLED = 3,
}

export type BountyMetadata = {
  title: string;
  description: string;
  imageUrl?: string;
  externalUrl?: string;
};

// POIDH Factory ABI - for fetching bounty addresses
export const POIDH_FACTORY_ABI = [
  {
    inputs: [],
    name: "getBountiesCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "limit", type: "uint256" },
      { internalType: "uint256", name: "offset", type: "uint256" },
    ],
    name: "getBounties",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "metadataURI", type: "string" },
      { internalType: "bool", name: "joinable", type: "bool" },
    ],
    name: "createBounty",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// POIDH Bounty ABI - for individual bounty interactions
export const POIDH_ABI = [
  // Read functions
  {
    inputs: [],
    name: "issuer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "metadataURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "state",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "joinable",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getClaimsCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "claimId", type: "uint256" }],
    name: "getClaim",
    outputs: [
      { internalType: "address", name: "claimant", type: "address" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "proofURI", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentVote",
    outputs: [
      { internalType: "uint256", name: "claimId", type: "uint256" },
      { internalType: "uint256", name: "yes", type: "uint256" },
      { internalType: "uint256", name: "no", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "votingRound", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "account_Stake",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "votingRound", type: "uint256" },
    ],
    name: "account_Round_HasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [],
    name: "stake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "proofURI", type: "string" },
    ],
    name: "submitClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "claimId", type: "uint256" }],
    name: "initiateVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "support", type: "bool" }],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "resolveVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "claimId", type: "uint256" }],
    name: "acceptClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
