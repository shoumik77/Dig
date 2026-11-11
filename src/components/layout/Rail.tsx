"use client";

import { Archive, Clock, Compass, PanelLeft, Search } from "lucide-react";

export type RailSection = "explore" | "crates";

interface RailProps {
  section: RailSection;
  onExplore(): void;
  onSearch(): void;
  onCrates(): void;
  onRecents(): void;
  onExpand(): void;
}

function RailButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-150 enabled:active:scale-[0.96] motion-safe:transition-transform ${
        active
          ? "bg-accent text-bg"
          : "text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

/** 72px compact icon rail — desktop only. */
export function Rail({
  section,
  onExplore,
  onSearch,
  onCrates,
  onRecents,
  onExpand,
}: RailProps) {
  return (
    <nav
      aria-label="Primary"
      className="flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-bg"
    >
      <div className="flex h-14 items-center justify-center text-[19px] font-semibold italic tracking-tight text-text">
        dig.
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <RailButton label="Explore" active={section === "explore"} onClick={onExplore}>
          <Compass size={17} strokeWidth={1.75} />
        </RailButton>
        <RailButton label="Search" onClick={onSearch}>
          <Search size={17} strokeWidth={1.75} />
        </RailButton>
        <RailButton label="My crates" active={section === "crates"} onClick={onCrates}>
          <Archive size={17} strokeWidth={1.75} />
        </RailButton>
        <RailButton label="Recently explored" onClick={onRecents}>
          <Clock size={17} strokeWidth={1.75} />
        </RailButton>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pb-4">
        <RailButton label="Expand navigation" onClick={onExpand}>
          <PanelLeft size={17} strokeWidth={1.75} />
        </RailButton>
        {/* profile placeholder */}
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs text-muted"
        >
          J
        </span>
      </div>
    </nav>
  );
}
