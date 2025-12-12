import { NextRequest, NextResponse } from "next/server";

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
];

// Simple in-memory cache for IPFS content
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    const { cid } = await params;

    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(cid);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Try each gateway until one succeeds
    let lastError: Error | null = null;

    for (const gateway of IPFS_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}/${cid}`, {
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          const data = await response.json();

          // Cache the result
          cache.set(cid, { data, timestamp: Date.now() });

          return NextResponse.json(data);
        }
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    console.error("Failed to fetch from all IPFS gateways:", lastError);
    return NextResponse.json(
      { error: "Failed to fetch from IPFS" },
      { status: 502 }
    );
  } catch (error) {
    console.error("IPFS fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
