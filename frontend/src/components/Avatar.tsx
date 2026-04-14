import { useEffect, useMemo, useState } from 'react';
import { resolveMediaUrl } from '../hooks/api';

type AvatarProps = {
  name?: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const initial = useMemo(() => (name?.trim()?.charAt(0) || '').toUpperCase(), [name]);
  const resolvedSrc = useMemo(() => resolveMediaUrl(src), [src]);
  const isVideo = !!resolvedSrc && /\.(mp4|webm|ogg)$/i.test(resolvedSrc);

  useEffect(() => {
    setBroken(false);
  }, [resolvedSrc]);

  if (resolvedSrc && !broken) {
    if (isVideo) {
      return (
        <video
          src={resolvedSrc}
          className={`${sizeMap[size]} rounded-full object-cover bg-input border border-[#363636]`}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setBroken(true)}
        />
      );
    }
    return (
      <img
        src={resolvedSrc}
        alt={name || 'avatar'}
        className={`${sizeMap[size]} rounded-full object-cover bg-input border border-[#363636]`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-input border border-[#363636] flex items-center justify-center text-muted text-sm font-medium`}
      aria-label='placeholder avatar'
    >
      {initial || <span className='opacity-60'>-</span>}
    </div>
  );
}
