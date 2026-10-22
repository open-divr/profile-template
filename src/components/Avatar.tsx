import { useState } from 'react';
import noPhoto from '../assets/no-photo.svg';
import { log } from '../log';

/**
 * A person's picture. Avatar URLs from the platform are already circular images; they must be shown as
 * real `<img>` elements (the platform requires the owner's avatar to be visible as an image). A missing or
 * broken picture falls back to a bundled "no photo" silhouette, so the layout never shows a broken image.
 */
export function Avatar({ src, name, size = 48, className = '' }: { src: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const missing = src === '' || failed === src;
  return (
    <img
      src={missing ? noPhoto : src}
      alt={name}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      className={`shrink-0 rounded-full bg-raised object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        if (missing) return;
        log('warn', 'profile.avatar', 'picture failed to load', { recovery: 'showed the no-photo picture' });
        setFailed(src);
      }}
    />
  );
}
