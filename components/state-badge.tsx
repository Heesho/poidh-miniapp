import { cn } from "@/lib/utils";
import { BountyState } from "@/lib/contracts";

type StateBadgeProps = {
  state: BountyState;
  className?: string;
  size?: "sm" | "md" | "lg";
  dotOnly?: boolean;
};

const stateConfig: Record<
  BountyState,
  {
    label: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
  }
> = {
  [BountyState.OPEN]: {
    label: "Open",
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
    dotColor: "bg-green-500",
  },
  [BountyState.VOTING]: {
    label: "Voting",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    dotColor: "bg-amber-500",
  },
  [BountyState.CLOSED]: {
    label: "Closed",
    bgColor: "bg-zinc-500/10",
    textColor: "text-zinc-400",
    dotColor: "bg-zinc-500",
  },
  [BountyState.CANCELLED]: {
    label: "Cancelled",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    dotColor: "bg-red-500",
  },
};

const sizeClasses = {
  sm: {
    badge: "px-2 py-0.5 text-[9px] gap-1",
    dot: "h-1.5 w-1.5",
  },
  md: {
    badge: "px-2.5 py-1 text-[10px] gap-1.5",
    dot: "h-2 w-2",
  },
  lg: {
    badge: "px-3 py-1.5 text-xs gap-2",
    dot: "h-2.5 w-2.5",
  },
};

export function StateBadge({
  state,
  className,
  size = "md",
  dotOnly,
}: StateBadgeProps) {
  const config = stateConfig[state] ?? stateConfig[BountyState.OPEN];
  const sizeClass = sizeClasses[size];

  if (dotOnly) {
    return (
      <span
        className={cn(
          "inline-block rounded-full",
          sizeClass.dot,
          config.dotColor,
          state === BountyState.OPEN && "animate-pulse",
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wider",
        sizeClass.badge,
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span
        className={cn(
          "rounded-full",
          sizeClass.dot,
          config.dotColor,
          state === BountyState.OPEN && "animate-pulse",
          state === BountyState.VOTING && "animate-pulse"
        )}
      />
      {config.label}
    </span>
  );
}
