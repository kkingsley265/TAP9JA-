import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Headphones,
  Loader2,
  PlayCircle,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch, openPaystackPopup, type PublicConfig, type PublicProduct } from '../lib/api';
import { formatNairaFromKobo, PRODUCT_TYPES, type ProductType } from '../shared/platforms';

interface StoreBuyModalProps {
  open: boolean;
  onClose: () => void;
  product: PublicProduct | null;
  username: string;
  creatorName: string;
  onPurchased?: (productId: string) => void;
}

interface DeliveryPayload {
  productId: string;
  title: string;
  productType: ProductType;
  externalUrl: string;
  embed: {
    embedType: 'iframe' | 'none';
    embedUrl: string | null;
    height?: number;
  };
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  const meta = PRODUCT_TYPES[type] || PRODUCT_TYPES.file;
  const Icon =
    type === 'video' ? PlayCircle : type === 'audio' ? Headphones : type === 'community' ? Users : FileText;
  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold">
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.shortLabel}</span>
    </span>
  );
}

export function StoreBuyModal({
  open,
  onClose,
  product,
  username,
  creatorName,
  onPurchased,
}: StoreBuyModalProps) {
  const [buyerEmail, setBuyerEmail] = useState('');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [verifiedData, setVerifiedData] = useState<{
    reference: string;
    amountKobo: number;
    delivery: DeliveryPayload;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setVerifiedData(null);
    setSubmitting(false);
    apiFetch<PublicConfig>('/api/config', { authMode: 'none' })
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [open, product?.id]);

  if (!open || !product) return null;

  const verifyProductPurchase = async (reference: string, emailUsed: string) => {
    const res = await apiFetch<{
      verified: boolean;
      reference: string;
      amountKobo: number;
      delivery: DeliveryPayload;
    }>('/api/payments/verify-product', {
      method: 'POST',
      authMode: 'none',
      body: JSON.stringify({
        reference,
        productId: product.id,
        buyerEmail: emailUsed,
      }),
    });
    if (res.verified && res.delivery) {
      setVerifiedData({
        reference: res.reference,
        amountKobo: res.amountKobo,
        delivery: res.delivery,
      });
      onPurchased?.(product.id);
    }
  };

  const handleCheckout = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = buyerEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address or leave it blank.');
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

    const paystackEmail = trimmedEmail || `buyer.${Date.now()}@tap9ja.com.ng`;

    setSubmitting(true);
    openPaystackPopup({
      publicKey: config.paystackPublicKey,
      email: paystackEmail,
      amountKobo: product.price_kobo,
      referencePrefix: 'prod',
      metadata: {
        type: 'product_sale',
        product_id: product.id,
        seller_username: username,
        buyer_email: trimmedEmail,
      },
      onSuccess: async (reference) => {
        try {
          await verifyProductPurchase(reference, trimmedEmail);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not verify payment with Paystack.');
        } finally {
          setSubmitting(false);
        }
      },
      onCancel: async (reference) => {
        try {
          await verifyProductPurchase(reference, trimmedEmail);
        } catch {
          // Buyer closed Paystack before finishing payment
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

  const typeMeta = PRODUCT_TYPES[product.product_type] || PRODUCT_TYPES.file;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-buy-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-purple-700 text-white flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="store-buy-title" className="text-lg font-display font-bold text-slate-950">
                {verifiedData ? 'Instant Product Access' : 'Complete Your Purchase'}
              </h2>
              <p className="text-xs text-slate-500">From {creatorName} (@{username})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            aria-label="Close checkout dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {verifiedData ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-950">Payment Verified — Instant Access Unlocked</p>
                <p className="text-xs text-emerald-800 font-mono-nums truncate">
                  Paid {formatNairaFromKobo(verifiedData.amountKobo)} · Ref: {verifiedData.reference}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-display font-bold text-slate-900">{verifiedData.delivery.title}</h3>
                <ProductTypeBadge type={verifiedData.delivery.productType} />
              </div>

              {/* Embedded Player for Video / Audio when embeddable */}
              {(verifiedData.delivery.productType === 'video' || verifiedData.delivery.productType === 'audio') &&
                verifiedData.delivery.embed?.embedType === 'iframe' &&
                verifiedData.delivery.embed.embedUrl && (
                  <div
                    className={`rounded-2xl overflow-hidden border border-slate-200 bg-black ${
                      verifiedData.delivery.embed.height ? '' : 'aspect-video'
                    }`}
                  >
                    <iframe
                      src={verifiedData.delivery.embed.embedUrl}
                      title={verifiedData.delivery.title}
                      width="100%"
                      height={verifiedData.delivery.embed.height ? String(verifiedData.delivery.embed.height) : '100%'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="block w-full"
                    />
                  </div>
                )}

              <a
                href={verifiedData.delivery.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-bold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 shadow-md"
              >
                <span>{PRODUCT_TYPES[verifiedData.delivery.productType]?.actionLabel || 'Access Now'}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Back to @{username}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3.5 items-start">
              {product.cover_url && (
                <img
                  src={product.cover_url}
                  alt={product.title}
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ProductTypeBadge type={product.product_type} />
                  <span className="text-xs text-slate-500 font-mono-nums">
                    {product.sales_count} {product.sales_count === 1 ? 'bought' : 'bought'}
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-slate-950 leading-snug">{product.title}</h3>
                {product.description && <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>}
                <p className="text-xl font-display font-extrabold font-mono-nums text-emerald-700 pt-0.5">
                  {formatNairaFromKobo(product.price_kobo)}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="store-buyer-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Your Email (optional — for Paystack receipt)
              </label>
              <input
                id="store-buyer-email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white font-bold text-sm hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying with Paystack...
                </>
              ) : (
                <>
                  <span>
                    Pay {formatNairaFromKobo(product.price_kobo)} · {typeMeta.actionLabel}
                  </span>
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              Verified directly via Paystack · Instant ad-free delivery
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
