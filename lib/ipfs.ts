import type { BountyMetadata } from "./contracts";

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Upload metadata to IPFS via our API route
 */
export async function uploadToIPFS(metadata: BountyMetadata): Promise<string> {
  const response = await fetch("/api/ipfs/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to IPFS: ${error}`);
  }

  const { cid } = await response.json();
  return cid;
}

/**
 * Fetch metadata from IPFS
 * Handles both raw CIDs and ipfs:// URIs
 */
export async function fetchFromIPFS<T = BountyMetadata>(
  uri: string
): Promise<T | null> {
  if (!uri) return null;

  // Extract CID from various URI formats
  let cid = uri;
  if (uri.startsWith("ipfs://")) {
    cid = uri.replace("ipfs://", "");
  } else if (uri.startsWith("https://")) {
    // Already a full URL, try to extract CID
    const match = uri.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (match) {
      cid = match[1];
    } else {
      // Direct URL fetch
      try {
        const response = await fetch(uri);
        if (!response.ok) return null;
        return (await response.json()) as T;
      } catch {
        return null;
      }
    }
  }

  try {
    // Use our API route to fetch from IPFS
    const response = await fetch(`/api/ipfs/${encodeURIComponent(cid)}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Get the IPFS gateway URL for a CID
 */
export function getIPFSUrl(cid: string): string {
  if (!cid) return "";
  if (cid.startsWith("ipfs://")) {
    cid = cid.replace("ipfs://", "");
  }
  return `${PINATA_GATEWAY}/${cid}`;
}

/**
 * Format an IPFS CID as ipfs:// URI
 */
export function toIPFSUri(cid: string): string {
  if (cid.startsWith("ipfs://")) return cid;
  return `ipfs://${cid}`;
}
