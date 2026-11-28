import { CheckCircle2, Heart, Loader2, MailCheck, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch, openPaystackPopup, type PublicConfig } from '../lib/api';

interface SupportTap9jaModalProps {
  open: boolean;
  onClose: () => void;
  sourceUsername: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000];

export function SupportTap9jaModal({ open, onClose, sourceUsername }: SupportTap9jaModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(1000);
  const [customInput, setCustomInput] = useState<string>('');
  const [supporterName, setSupporterName] = useState<string>('');
  const [supporterEmail, setSupporterEmail] = useState<string>('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{
    amountNgn: number;
    reference: string;
    email: string;
  } | null>(null);

  const customInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSuccessInfo(null);
    setSubmitting(false);
    apiFetch<PublicConfig>('/api/config', { authMode: 'none' })
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [open]);

  if (!open) return null;

  const effectiveAmount = selectedPreset === 'custom' ? Number(customInput) : selectedPreset;

  const handleSelectCustom = () => {
    setSelectedPreset('custom');
    setTimeout(() => customInputRef.current?.focus(), 20);
  };

  const handlePay = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 100) {
      setError('Minimum support amount is ₦100.');
      return;
    }

    const email = supporterEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address so we can send your receipt.');
      return;
    }

    if (config?.paystackKeyMismatch) {
      setError(
        'Paystack key mismatch: Public Key and Secret Key must both be LIVE (or both TEST) in Cloudflare Environment Variables.'
      );
      return;
    }
    if (!config?.paystackConfigured || !config.paystackPublicKey) {
      setError(
        'Paystack payments are not configured yet. The site owner needs to add PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY in environment variables.'
      );
      return;
    }

    const safeName = supporterName.trim() || 'TAP9JA Supporter';

    const verifySupport = async (reference: string) => {
      const res = await apiFetch<{
        verified: boolean;
        amountKobo: number;
        reference: string;
        receiptSent: boolean;
      }>('/api/payments/verify-platform-support', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({
          reference,
          supporterName: safeName,
          supporterEmail: email,
          sourceUsername,
        }),
      });
      if (res.verified) {
        setSuccessInfo({
          amountNgn: res.amountKobo / 100,
          reference: res.reference,
          email,
        });
      }
    };

    setSubmitting(true);
    openPaystackPopup({
      publicKey: config.paystackPublicKey,
      email,
      amountKobo: Math.round(effectiveAmount * 100),
      referencePrefix: 'sup',
      metadata: {
        type: 'platform_support',
        source_username: sourceUsername,
        supporter_name: safeName,
        supporter_email: email,
      },
      onSuccess: async (reference) => {
        try {
          await verifySupport(reference);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Payment verification failed.');
        } finally {
          setSubmitting(false);
        }
      },
      onCancel: async (reference) => {
        try {
          await verifySupport(reference);
        } catch {
          // User closed Paystack without completing payment
        } finally {
          setSubmitting(false);
        }
      },
      onError: (msg) => {
        setSubmitting(false);
        setError(msg);
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-tap9ja-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 id="support-tap9ja-title" className="text-lg font-display font-bold text-slate-950 leading-snug">
                Love what TAP9JA is doing? 💜
              </h2>
              <p className="text-xs text-slate-500">100% goes to keeping TAP9JA free</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            aria-label="Close support TAP9JA dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successInfo ? (
          <div className="py-5 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-display font-bold text-slate-950 leading-snug">
                Thank you! You just helped keep TAP9JA free for everyone 🙏
              </h3>
              <p className="text-sm text-slate-600">
                Your contribution of{' '}
                <span className="font-mono-nums font-bold text-emerald-700">
                  ₦{successInfo.amountNgn.toLocaleString('en-NG')}
                </span>{' '}
                has been confirmed.
              </p>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800">
                <MailCheck className="h-4 w-4 shrink-0" />
                <span>Receipt sent to {successInfo.email}</span>
              </div>
              <p className="text-xs font-mono-nums text-slate-400 pt-1">Ref: {successInfo.reference}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePay} className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed rounded-2xl bg-purple-50/70 border border-purple-200/70 p-3.5">
              We're building TAP9JA to help thousands of Nigerians sell, earn and grow for FREE. Your small support helps us keep the lights on and build more free tools for everyone.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Choose support amount (NGN)</label>
              <div className="grid grid-cols-2 gap-2.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const selected = selectedPreset === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedPreset(amt)}
                      className={`h-11 rounded-2xl font-mono-nums text-sm font-semibold border transition-all ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ₦{amt.toLocaleString('en-NG')}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleSelectCustom}
                  className={`h-11 rounded-2xl text-sm font-semibold border transition-all ${
                    selectedPreset === 'custom'
                      ? 'border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Custom Amount
                </button>
              </div>

              {selectedPreset === 'custom' && (
                <input
                  ref={customInputRef}
                  type="number"
                  min={100}
                  step={50}
                  required
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom amount in ₦ (min ₦100)"
                  className="mt-2.5 w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono-nums"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="support-tap9ja-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your name (optional)
                </label>
                <input
                  id="support-tap9ja-name"
                  type="text"
                  value={supporterName}
                  onChange={(e) => setSupporterName(e.target.value)}
                  placeholder="e.g. Tunde"
                  maxLength={80}
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="support-tap9ja-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email (for receipt)
                </label>
                <input
                  id="support-tap9ja-email"
                  type="email"
                  required
                  value={supporterEmail}
                  onChange={(e) => setSupporterEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white font-semibold text-sm hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying with Paystack...
                </>
              ) : (
                <>Support Now</>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              Verified via Paystack · Instant email receipt
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
