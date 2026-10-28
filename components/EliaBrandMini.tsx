'use client';

import Image from 'next/image';

type EliaBrandMiniProps = { variant?: 'sidebar' | 'profile' | 'topbar' };

/** Icon above a real, selectable brand wordmark (never a placeholder initial). */
export function EliaBrandMini({ variant = 'profile' }: EliaBrandMiniProps) {
  return (
    <span className={`elia-mini-brand elia-mini-brand--${variant}`} aria-label="Élia Marier">
      <span className="elia-mini-brand__emblem" aria-hidden="true">
        <Image src="/logo-mark.png" alt="" width={1024} height={1024} unoptimized />
      </span>
      <span className="elia-mini-brand__wordmark">ÉLIA MARIER</span>
      {variant === 'sidebar' && <span className="elia-mini-brand__caption">STUDIO WORKSPACE</span>}
    </span>
  );
}
