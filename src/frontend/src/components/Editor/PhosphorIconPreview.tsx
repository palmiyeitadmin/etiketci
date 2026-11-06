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
      <div className={`flex items-center justify-center font-mono text-xs text-ink-3 ${className}`} style={{ width: size, height: size }}>
        {iconKey.slice(0, 2)}
      </div>
    );
  }

  if (!IconComponent) {
    // Quiet placeholder of the same size while the icon module loads (no looping animation).
    return <div aria-hidden className={`rounded-md bg-raised ${className}`} style={{ width: size, height: size }} />;
  }

  return <IconComponent size={size} weight="regular" className={className} />;
}
