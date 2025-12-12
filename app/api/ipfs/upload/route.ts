import { NextRequest, NextResponse } from "next/server";

const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: "IPFS service not configured" },
        { status: 500 }
      );
    }

    const metadata = await request.json();

    // Validate required fields
    if (!metadata.title || !metadata.description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const response = await fetch(PINATA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `poidh-bounty-${Date.now()}`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Pinata error:", error);
      return NextResponse.json(
        { error: "Failed to upload to IPFS" },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error("IPFS upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
