import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  variant?: 'light' | 'dark';
}

export function PasswordInput({
  variant = 'light',
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const inputTheme =
    variant === 'dark'
      ? 'bg-zinc-950 border-white/15 text-white placeholder:text-zinc-500 focus:ring-emerald-500/40'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-emerald-500/30 focus:border-emerald-500';

  const buttonTheme =
    variant === 'dark'
      ? 'text-zinc-400 hover:text-white'
      : 'text-slate-400 hover:text-slate-700';

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`w-full h-11 pl-4 pr-12 rounded-2xl border text-sm focus:outline-none focus:ring-2 ${inputTheme} ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className={`absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${buttonTheme}`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
