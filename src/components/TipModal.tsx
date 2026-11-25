import { CheckCircle2, HeartHandshake, Loader2, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch, openPaystackPopup, type PublicConfig } from '../lib/api';

interface TipModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  creatorName: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000];

export function TipModal({ open, onClose, username, creatorName }: TipModalProps) {
  const [amountNgn, setAmountNgn] = useState<number>(1000);
  const [customInput, setCustomInput] = useState<string>('');
  const [fromName, setFromName] = useState<string>('');
  const [fromEmail, setFromEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{ amountNgn: number; reference: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSuccessInfo(null);
    apiFetch<PublicConfig>('/api/config', { authMode: 'none' })
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [open]);

  if (!open) return null;

  const effectiveAmount = customInput.trim() ? Number(customInput) : amountNgn;

  const handlePay = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 100) {
      setError('Minimum tip amount is ₦100.');
      return;
    }
    const email = fromEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address for your Paystack receipt.');
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

    const safeFromName = fromName.trim() || 'Anonymous Supporter';
    const safeMessage = message.trim();

    setSubmitting(true);
    openPaystackPopup({
      publicKey: config.paystackPublicKey,
      email,
      amountKobo: Math.round(effectiveAmount * 100),
      metadata: {
        type: 'tip',
        to_username: username,
        from_name: safeFromName,
        from_email: email,
        message: safeMessage,
      },
      onSuccess: async (reference) => {
        try {
          const verified = await apiFetch<{ verified: boolean; amountKobo: number; reference: string }>(
            '/api/payments/verify-tip',
            {
              method: 'POST',
              authMode: 'none',
              body: JSON.stringify({
                reference,
                username,
                fromName: safeFromName,
                fromEmail: email,
                message: safeMessage,
              }),
            }
          );
          setSuccessInfo({
            amountNgn: verified.amountKobo / 100,
            reference: verified.reference,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Payment verification failed.');
        } finally {
          setSubmitting(false);
        }
      },
      onCancel: async (reference) => {
        try {
          const verified = await apiFetch<{ verified: boolean; amountKobo: number; reference: string }>(
            '/api/payments/verify-tip',
            {
              method: 'POST',
              authMode: 'none',
              body: JSON.stringify({
                reference,
                username,
                fromName: safeFromName,
                fromEmail: email,
                message: safeMessage,
              }),
            }
          );
          if (verified.verified) {
            setSuccessInfo({
              amountNgn: verified.amountKobo / 100,
              reference: verified.reference,
            });
          }
        } catch {
          // User closed popup without completing payment
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tip-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-700 text-white flex items-center justify-center shrink-0">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h2 id="tip-modal-title" className="text-lg font-display font-bold">
                Support {creatorName}
              </h2>
              <p className="text-xs text-slate-500">Send a Naira tip securely via Paystack</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Close tip dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successInfo ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900">Tip Verified & Sent</h3>
              <p className="text-sm text-slate-600 mt-1">
                You just supported <span className="font-semibold">{creatorName}</span> with{' '}
                <span className="font-mono-nums font-semibold text-emerald-700">
                  ₦{successInfo.amountNgn.toLocaleString('en-NG')}
                </span>
                .
              </p>
              <p className="text-xs font-mono-nums text-slate-400 mt-2">Ref: {successInfo.reference}</p>
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Choose amount (NGN)</label>
              <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const selected = !customInput.trim() && amountNgn === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmountNgn(amt);
                        setCustomInput('');
                      }}
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
              </div>
              <input
                type="number"
                min={100}
                step={50}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or enter custom amount (₦100 min)"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono-nums"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Your name</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Chidi"
                  maxLength={80}
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email (for Paystack)</label>
                <input
                  type="email"
                  required
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Shoutout note (optional)</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Keep dropping heat!"
                maxLength={240}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white font-semibold text-sm hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying with Paystack...
                </>
              ) : (
                <>Send ₦{Number.isFinite(effectiveAmount) ? effectiveAmount.toLocaleString('en-NG') : '0'} Tip</>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified directly via Paystack · 90% goes to creator
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
