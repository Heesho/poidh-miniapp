"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, List, PlusCircle } from "lucide-react";

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-black"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
        paddingTop: "8px",
      }}
    >
      <div className="flex justify-around items-center max-w-[520px] mx-auto px-4">
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center p-3 transition-colors",
            pathname === "/"
              ? "text-rose-400"
              : "text-gray-400 hover:text-gray-300"
          )}
        >
          <Home className="w-6 h-6" />
        </Link>

        <Link
          href="/create"
          className={cn(
            "flex items-center justify-center p-3 transition-colors",
            pathname === "/create"
              ? "text-rose-400"
              : "text-gray-400 hover:text-gray-300"
          )}
        >
          <PlusCircle className="w-6 h-6" />
        </Link>

        <Link
          href="/bounties"
          className={cn(
            "flex items-center justify-center p-3 transition-colors",
            pathname === "/bounties"
              ? "text-rose-400"
              : "text-gray-400 hover:text-gray-300"
          )}
        >
          <List className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  );
}
