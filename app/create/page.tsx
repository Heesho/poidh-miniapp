"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import { PlusCircle, Coins, Users, AlertCircle } from "lucide-react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "wagmi/chains";
import { parseEther, type Address } from "viem";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { UserHeader } from "@/components/user-header";
import { CONTRACT_ADDRESSES, POIDH_FACTORY_ABI, type BountyMetadata } from "@/lib/contracts";
import { uploadToIPFS, toIPFSUri } from "@/lib/ipfs";
import { cn } from "@/lib/utils";

type MiniAppContext = {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
};

export default function CreateBountyPage() {
  const router = useRouter();
  const readyRef = useRef(false);
  const autoConnectAttempted = useRef(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [joinable, setJoinable] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const primaryConnector = connectors[0];

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

  // Contract interaction
  const {
    data: txHash,
    writeContract,
    isPending: isWriting,
    reset: resetWrite,
    error: writeError,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  // Handle successful creation
  useEffect(() => {
    if (receipt?.status === "success") {
      router.push("/bounties");
    }
  }, [receipt, router]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || "Transaction failed");
      resetWrite();
    }
  }, [writeError, resetWrite]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      let targetAddress = address;
      if (!targetAddress) {
        if (!primaryConnector) {
          throw new Error("Wallet connector not available");
        }
        const result = await connectAsync({
          connector: primaryConnector,
          chainId: base.id,
        });
        targetAddress = result.accounts[0];
      }

      if (!targetAddress) {
        throw new Error("Unable to determine wallet address");
      }

      const metadata: BountyMetadata = {
        title: title.trim(),
        description: description.trim(),
      };

      const cid = await uploadToIPFS(metadata);
      const metadataURI = toIPFSUri(cid);

      setIsUploading(false);

      await writeContract({
        account: targetAddress as Address,
        address: CONTRACT_ADDRESSES.factory as Address,
        abi: POIDH_FACTORY_ABI,
        functionName: "createBounty",
        args: [metadataURI, joinable],
        value: parseEther(amount),
        chainId: base.id,
      });
    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "Failed to create bounty");
    }
  }, [
    address,
    amount,
    connectAsync,
    description,
    joinable,
    primaryConnector,
    title,
    writeContract,
  ]);

  const isSubmitting = isUploading || isWriting || isConfirming;
  const canSubmit = title.trim() && description.trim() && amount && !isSubmitting;

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
              <PlusCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                New Bounty
              </h1>
              <p className="text-[11px] text-zinc-400">
                Create a challenge
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

        {/* Form Content */}
        <div className="flex-1 flex flex-col px-4">
          <div className="flex flex-col gap-5">
            {/* Title */}
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's the challenge?"
                maxLength={100}
                className="input-base"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're looking for..."
                maxLength={500}
                rows={4}
                className="input-base resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Coins className="h-3.5 w-3.5 text-rose-400" />
                Amount <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  className="input-base"
                  style={{ paddingLeft: '3rem' }}
                  disabled={isSubmitting}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <span className="text-base font-medium text-zinc-400">Ξ</span>
                </div>
              </div>
            </div>

            {/* Joinable Toggle */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                      joinable ? "bg-blue-500/10" : "bg-zinc-800"
                    )}>
                      <Users className={cn(
                        "h-4 w-4 transition-colors",
                        joinable ? "text-blue-400" : "text-zinc-500"
                      )} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Open Bounty</div>
                      <div className="text-[11px] text-zinc-500">Others can add funds</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJoinable(!joinable)}
                    disabled={isSubmitting}
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-all duration-200",
                      joinable
                        ? "bg-gradient-to-r from-blue-500 to-rose-500"
                        : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200",
                        joinable ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spacer to push button to bottom */}
          <div className="flex-1" />

          {/* Bottom Section */}
          <div className="pt-4">
          {/* Error */}
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className={cn(
              "w-full h-12 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-rose-500/20",
              !canSubmit && "opacity-50 cursor-not-allowed shadow-none"
            )}
          >
            {isUploading
              ? "Uploading..."
              : isWriting
                ? "Confirm in wallet..."
                : isConfirming
                  ? "Creating..."
                  : `Create Bounty${amount ? ` for Ξ${amount}` : ""}`}
          </Button>
          </div>
        </div>
      </div>
      <NavBar />
    </main>
  );
}
