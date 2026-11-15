import { useState } from 'react';
import { resolveAvatarUrl } from '../lib/demoAvatars';

interface AvatarProps {
  src?: string | null;
  name: string;
  sizeClass?: string;
  ringClass?: string;
}

export function Avatar({ src, name, sizeClass = 'h-24 w-24', ringClass = 'ring-4 ring-white/80' }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const resolved = resolveAvatarUrl(src);
  const initials = (name || 'T9')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (!resolved || errored) {
    return (
      <div
        className={`${sizeClass} ${ringClass} rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-purple-700 text-white font-display font-bold text-xl shrink-0 shadow-lg`}
        aria-label={name}
      >
        {initials || '9J'}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={`${name} profile portrait`}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={`${sizeClass} ${ringClass} rounded-full object-cover shrink-0 shadow-lg bg-slate-200`}
    />
  );
}
