import {
  Check,
  ExternalLink,
  Eye,
  HeartHandshake,
  MessageCircle,
  PlayCircle,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BrandMark } from '../components/BrandMark';
import { FreePlanAdModal } from '../components/FreePlanAdModal';
import { PlatformBadgeIcon, VerifiedBlueTick } from '../components/PlatformIcon';
import { QrModal } from '../components/QrModal';
import { StoreBuyModal } from '../components/StoreBuyModal';
import { TipModal } from '../components/TipModal';
import { apiFetch, type PublicBioResponse, type PublicProduct } from '../lib/api';
import {
  formatNairaFromKobo,
  isProActive,
  parsePreviewEmbed,
  parseSpotifyEmbed,
  parseYouTubeEmbed,
  PRODUCT_TYPES,
  resolveThemeId,
  THEMES,
} from '../shared/platforms';

export default function PublicBioPage() {
  const { username = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [data, setData] = useState<PublicBioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [adConfig, setAdConfig] = useState<{ adsEnabled: boolean; adCode: string } | null>(null);
  const [pendingLink, setPendingLink] = useState<{ id: string; title: string; url: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    setAdConfig(null);
    setPendingLink(null);
    setSelectedProduct(null);
    apiFetch<PublicBioResponse>(
      `/api/public/profile/${encodeURIComponent(username)}${isPreview ? '?preview=1' : ''}`,
      { authMode: 'none', cache: 'no-store' }
    )
      .then((res) => {
        setData(res);
        document.title = `${res.profile.name} (@${res.profile.username}) — TAP9JA`;
        const activePro =
          Boolean(res.profile.is_pro) &&
          (res.profile.pro_expires_at
            ? isProActive(res.profile.is_pro, res.profile.pro_expires_at)
            : res.profile.show_watermark === false);
        if (!activePro) {
          apiFetch<{ adsEnabled: boolean; adCode: string }>('/api/ads/config', {
            authMode: 'none',
            cache: 'no-store',
          })
            .then(setAdConfig)
            .catch(() => {});
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Creator page not found.');
      })
      .finally(() => setLoading(false));
  }, [username, isPreview]);

  const handleLinkClick = (linkId: string) => {
    try {
      fetch('/api/public/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, username }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore tracking failure
    }
  };

  const handleCreatorLinkAction = (
    e: MouseEvent<HTMLAnchorElement>,
    link: { id: string; title: string; url: string },
    hasActivePro: boolean,
    creatorUsername: string
  ) => {
    if (hasActivePro || !adConfig?.adsEnabled) {
      handleLinkClick(link.id);
      return;
    }

    const storageKey = `tap9ja_ad_seen_${creatorUsername.toLowerCase()}`;
    let withinCooldown = false;
    try {
      const lastSeen = Number(window.localStorage.getItem(storageKey) || 0);
      if (Number.isFinite(lastSeen) && lastSeen > 0 && Date.now() - lastSeen < 30 * 60 * 1000) {
        withinCooldown = true;
      }
    } catch {
      withinCooldown = false;
    }

    if (withinCooldown) {
      handleLinkClick(link.id);
      return;
    }

    e.preventDefault();
    setPendingLink({ id: link.id, title: link.title, url: link.url });
  };

  const handleContinueAfterAd = () => {
    if (!pendingLink || !data) return;
    const storageKey = `tap9ja_ad_seen_${data.profile.username.toLowerCase()}`;
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // ignore storage errors
    }
    handleLinkClick(pendingLink.id);
    setPendingLink(null);
  };

  const handleProductPurchased = (productId: string) => {
    setData((prev) => {
      if (!prev || !prev.products) return prev;
      return {
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId ? { ...p, sales_count: p.sales_count + 1 } : p
        ),
      };
    });
  };

  const handleShare = async () => {
    const url = window.location.href.split('?')[0];
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.profile.name || 'TAP9JA',
          text: `Check out ${data?.profile.name || username} on TAP9JA`,
          url,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      setQrOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] rounded-3xl bg-white/10 border border-white/10 p-8 animate-pulse space-y-5">
          <div className="mx-auto h-24 w-24 rounded-full bg-white/15" />
          <div className="mx-auto h-6 w-44 rounded-lg bg-white/15" />
          <div className="mx-auto h-4 w-64 rounded-lg bg-white/10" />
          <div className="space-y-3 pt-4">
            <div className="h-14 rounded-2xl bg-white/10" />
            <div className="h-14 rounded-2xl bg-white/10" />
            <div className="h-14 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <BrandMark />
        <h1 className="text-2xl font-display font-bold text-slate-900 mt-6">Creator page not found</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-sm">
          {error || `tap9ja.com/u/${username} is still available to claim.`}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to={`/register?username=${encodeURIComponent(username.toLowerCase())}`}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold"
          >
            Claim @{username}
          </Link>
          <Link to="/" className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const { profile, links, products = [] } = data;
  const hasActivePro =
    Boolean(profile.is_pro) &&
    (profile.pro_expires_at
      ? isProActive(profile.is_pro, profile.pro_expires_at)
      : profile.show_watermark === false);
  const showWatermark = !hasActivePro;
  const resolvedThemeId = resolveThemeId(profile.theme, hasActivePro);
  const theme = THEMES[resolvedThemeId] || THEMES.free_theme_1;
  const ytEmbed = parseYouTubeEmbed(profile.youtube_url);
  const spotifyEmbed = parseSpotifyEmbed(profile.spotify_url);
  const whatsappClean = (profile.whatsapp_number || '').replace(/[^0-9]/g, '');

  return (
    <div className={`min-h-screen ${theme.pageBg} py-8 px-4 flex flex-col items-center transition-colors`}>
      <main className="w-full max-w-[480px] mx-auto">
        <div className={`relative p-6 sm:p-7 ${theme.cardBg}`}>
          {/* Optional Premium Cover Banner (Instagram Luxury) */}
          {theme.headerBanner && (
            <div className={`-mx-6 -mt-6 sm:-mx-7 sm:-mt-7 h-24 ${theme.headerBanner} mb-4 opacity-95`} />
          )}

          {/* Top Action Utility Row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className={`inline-flex items-center gap-1.5 text-xs font-mono-nums ${theme.textMuted}`}>
              <Eye className="h-3.5 w-3.5" />
              <span>{profile.total_views.toLocaleString('en-NG')} views</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className={`h-10 w-10 flex items-center justify-center transition-colors ${theme.linkBg}`}
                aria-label="Show QR Code"
                title="Show QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className={`h-10 px-3 flex items-center gap-1.5 text-xs font-semibold transition-colors ${theme.linkBg}`}
                aria-label="Share profile link"
              >
                {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                <span>{copiedShare ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Profile Header */}
          <div className={`flex flex-col items-center text-center ${theme.headerBanner ? '-mt-2' : ''}`}>
            <Avatar
              src={profile.avatar_url}
              name={profile.name}
              sizeClass="h-24 w-24"
              ringClass={theme.avatarRing}
            />
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <h1 className={`text-2xl font-display font-extrabold tracking-tight ${theme.textPrimary}`}>
                {profile.name}
              </h1>
              {profile.verified_tick && <VerifiedBlueTick className="h-5 w-5" />}
            </div>
            <p className={`text-xs font-mono-nums mt-0.5 ${theme.textMuted}`}>@{profile.username}</p>
            {hasActivePro && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                <Zap className="h-3 w-3 shrink-0" />
                <span>Pro — Ad Free Support</span>
              </div>
            )}
            {profile.bio && (
              <p className={`text-sm mt-3 leading-relaxed max-w-sm ${theme.textPrimary} opacity-90`}>{profile.bio}</p>
            )}
          </div>

          {/* Music Embeds (YouTube / Spotify) */}
          {(ytEmbed || spotifyEmbed) && (
            <div className="mt-6 space-y-3">
              {spotifyEmbed && (
                <div className="rounded-2xl overflow-hidden border border-white/10">
                  <iframe
                    src={spotifyEmbed}
                    title={`${profile.name} Spotify player`}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="block"
                  />
                </div>
              )}
              {ytEmbed && (
                <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black">
                  <iframe
                    src={ytEmbed}
                    title={`${profile.name} YouTube player`}
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="block w-full h-full"
                  />
                </div>
              )}
            </div>
          )}

          {/* Active Links List */}
          <div className="mt-6 space-y-3">
            {links.length === 0 ? (
              <p className={`text-center text-sm py-4 ${theme.textMuted}`}>No links added yet.</p>
            ) : (
              links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleCreatorLinkAction(e, link, hasActivePro, profile.username)}
                  className={`group flex items-center gap-3.5 p-3 transition-all hover:scale-[1.01] active:scale-[0.99] ${theme.linkBg}`}
                >
                  <PlatformBadgeIcon platform={link.platform} />
                  <span className="flex-1 text-sm font-semibold truncate">{link.title}</span>
                  <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 shrink-0 transition-opacity" />
                </a>
              ))
            )}
          </div>

          {/* TAP9JA Digital Store Section (Placed Below Links, Above Tip Jar — Zero Ads) */}
          {products.length > 0 && (
            <section aria-label="Creator Digital Shop" className="mt-7 pt-6 border-t border-current/10 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className={`h-4 w-4 ${theme.priceColor}`} />
                  <h2 className={`text-sm font-display font-bold uppercase tracking-wider ${theme.textPrimary}`}>
                    Digital Store
                  </h2>
                </div>
                {hasActivePro && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-500">
                    <ShieldCheck className="h-3 w-3" />
                    Pro Trusted Store
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {products.map((product) => {
                  const typeMeta = PRODUCT_TYPES[product.product_type] || PRODUCT_TYPES.file;
                  const previewEmbed = product.preview_url ? parsePreviewEmbed(product.preview_url) : null;
                  return (
                    <div key={product.id} className={`p-3.5 sm:p-4 ${theme.productCardBg}`}>
                      <div className="flex gap-3 items-start">
                        {product.cover_url && (
                          <img
                            src={product.cover_url}
                            alt={product.title}
                            loading="lazy"
                            className="h-16 w-16 rounded-xl object-cover shrink-0 border border-black/10"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${theme.badgeBg}`}>
                              {typeMeta.shortLabel}
                            </span>
                            {previewEmbed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                                <PlayCircle className="h-3 w-3" />
                                Free Preview
                              </span>
                            )}
                            {product.sales_count > 0 && (
                              <span className={`text-[11px] font-mono-nums ${theme.textMuted}`}>
                                · {product.sales_count} bought
                              </span>
                            )}
                          </div>
                          <h3 className={`text-sm font-display font-bold leading-snug ${theme.textPrimary}`}>
                            {product.title}
                          </h3>
                          {product.description && (
                            <p className={`text-xs mt-1 line-clamp-2 ${theme.textMuted}`}>{product.description}</p>
                          )}
                        </div>
                      </div>

                      {previewEmbed && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-current/15 bg-black/5">
                          <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 border-b border-current/10 bg-black/5">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${theme.textPrimary}`}>
                              <PlayCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              Preview ({previewEmbed.label})
                            </span>
                            <span className={`text-[10px] ${theme.textMuted}`}>Plays here before payment</span>
                          </div>
                          {previewEmbed.aspect === 'video' ? (
                            <div className="aspect-video w-full bg-black">
                              <iframe
                                src={previewEmbed.embedUrl}
                                title={`${product.title} preview`}
                                loading="lazy"
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <iframe
                              src={previewEmbed.embedUrl}
                              title={`${product.title} preview`}
                              loading="lazy"
                              className="w-full border-0 block"
                              height={previewEmbed.height || 180}
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center justify-between gap-3">
                        <span className={`text-base font-display font-extrabold font-mono-nums ${theme.priceColor}`}>
                          {formatNairaFromKobo(product.price_kobo)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className={`h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 transition-all ${theme.ctaBg}`}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tip Jar Section + Optional WhatsApp Quick Chat (Placed Below Links / Shop) */}
          <div className="mt-7 pt-6 border-t border-current/10 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setTipOpen(true)}
              className={`flex-1 h-12 px-5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${theme.ctaBg}`}
            >
              <HeartHandshake className="h-4 w-4" />
              <span>Support Me</span>
            </button>
            {whatsappClean && (
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-12 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${theme.linkBg}`}
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Conditional Watermark: Shown ONLY for Free / Expired Pro */}
      {showWatermark && (
        <footer className="mt-6 pb-4 text-center w-full max-w-[480px] mx-auto">
          <Link
            to="/"
            className={`inline-block text-xs font-medium hover:underline underline-offset-4 transition-opacity ${theme.textMuted}`}
          >
            Made with TAP9JA.com - Create your own free link
          </Link>
        </footer>
      )}

      <QrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        username={profile.username}
        displayName={profile.name}
      />
      <TipModal
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        username={profile.username}
        creatorName={profile.name}
      />
      <StoreBuyModal
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        username={profile.username}
        creatorName={profile.name}
        onPurchased={handleProductPurchased}
      />
      {!hasActivePro && adConfig?.adsEnabled && (
        <FreePlanAdModal
          open={Boolean(pendingLink)}
          mode="supporter"
          creatorUsername={profile.username}
          adCode={adConfig.adCode}
          targetLinkTitle={pendingLink?.title}
          targetUrl={pendingLink?.url}
          onContinue={handleContinueAfterAd}
        />
      )}
    </div>
  );
}
