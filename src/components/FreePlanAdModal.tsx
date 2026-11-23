import { ArrowRight, Clock, Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdCodeSlot } from './AdCodeSlot';
import { BrandMark } from './BrandMark';

interface FreePlanAdModalProps {
  open: boolean;
  mode: 'supporter' | 'dashboard';
  creatorUsername: string;
  adCode: string;
  targetLinkTitle?: string;
  targetUrl?: string;
  onContinue?: () => void;
  onAutoClose?: () => void;
  onUpgradeClick?: () => void;
}

export function FreePlanAdModal({
  open,
  mode,
  creatorUsername,
  adCode,
  targetLinkTitle,
  targetUrl,
  onContinue,
  onAutoClose,
  onUpgradeClick,
}: FreePlanAdModalProps) {
  const initialSeconds = mode === 'supporter' ? 5 : 6;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(mode === 'supporter' ? 5 : 6);
  }, [open, mode, targetUrl]);

  useEffect(() => {
    if (!open) return;
    if (secondsLeft <= 0) {
      if (mode === 'dashboard') {
        onAutoClose?.();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [open, secondsLeft, mode, onAutoClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'supporter' ? 'Sponsored ad before opening link' : 'Free plan sponsored break'}
    >
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* TAP9JA Green-Purple Gradient Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-purple-700 px-5 py-4 text-white flex items-center justify-between gap-3">
          <BrandMark size="sm" lightText />
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-mono-nums font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {mode === 'supporter'
                ? secondsLeft > 0
                  ? `Ad ends in ${secondsLeft}...`
                  : 'Ready to continue'
                : `Closes in ${secondsLeft}s`}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Ad Network Render Slot */}
          <AdCodeSlot adCode={adCode} />

          {/* Trust & Plan Copy */}
          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 px-4 py-3 text-xs leading-relaxed text-slate-700">
            {mode === 'supporter' ? (
              <p>
                You&apos;re supporting <strong className="text-slate-950">@{creatorUsername}</strong> — This short ad
                helps keep TAP9JA free. Upgrade to Pro to remove ads.
              </p>
            ) : (
              <p>
                You&apos;re on the <strong className="text-slate-950">TAP9JA Free Plan</strong>. This brief sponsored
                break closes automatically in a few seconds. Upgrade to Pro (₦1,000/mo) for an ad-free dashboard &amp;
                bio page.
              </p>
            )}
          </div>

          {/* Action Footer */}
          {mode === 'supporter' ? (
            <div className="space-y-2">
              {targetLinkTitle && (
                <p className="text-xs text-slate-500 text-center truncate">
                  Destination: <span className="font-medium text-slate-700">{targetLinkTitle}</span>
                </p>
              )}
              {secondsLeft > 0 ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>Ad ends in {secondsLeft}...</span>
                </button>
              ) : (
                <a
                  href={targetUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onContinue?.()}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Auto-closes in {secondsLeft}s</span>
              </div>
              {onUpgradeClick && (
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Upgrade to Pro</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
