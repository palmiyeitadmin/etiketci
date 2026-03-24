"use client";

import { useEffect, useState } from "react";
import { loadPhosphorIconComponent, type PhosphorIconKey } from "@/lib/phosphor-icon-catalog";
import { type Icon } from "@phosphor-icons/react";

export function PhosphorIconPreview({
  iconKey,
  size = 28,
  className = "",
}: {
  iconKey: PhosphorIconKey;
  size?: number;
  className?: string;
}) {
  const [IconComponent, setIconComponent] = useState<Icon | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setIconComponent(null);
    setFailed(false);

    void loadPhosphorIconComponent(iconKey)
      .then((LoadedIcon) => {
        if (active) {
          setIconComponent(() => LoadedIcon);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [iconKey]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center text-[11px] font-black uppercase tracking-[0.18em] text-[color:var(--plms-text-subtle)] ${className}`}>
        {iconKey.slice(0, 2)}
      </div>
    );
  }

  if (!IconComponent) {
    return <div className={`h-7 w-7 animate-pulse rounded-lg bg-white/10 ${className}`} />;
  }

  return <IconComponent size={size} weight="regular" className={className} />;
}
