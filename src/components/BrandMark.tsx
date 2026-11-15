interface BrandMarkProps {
  lightText?: boolean;
  size?: 'sm' | 'md';
}

export function BrandMark({ lightText = false, size = 'md' }: BrandMarkProps) {
  const boxSize = size === 'sm' ? 'h-8 w-8 rounded-xl text-xs' : 'h-9 w-9 rounded-xl text-sm';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <span
        className={`${boxSize} inline-flex items-center justify-center font-display font-extrabold tracking-tight text-white bg-gradient-to-br from-emerald-500 via-emerald-600 to-purple-700 shadow-sm`}
      >
        9J
      </span>
      <span
        className={`${textSize} font-display font-extrabold tracking-tight whitespace-nowrap ${
          lightText ? 'text-white' : 'text-slate-900'
        }`}
      >
        TAP<span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">9JA</span>
      </span>
    </span>
  );
}
