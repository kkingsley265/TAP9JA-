import {
  Check,
  ExternalLink,
  Eye,
  HeartHandshake,
  MessageCircle,
  QrCode,
  Share2,
  Zap,
} from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BrandMark } from '../components/BrandMark';
import { FreePlanAdModal } from '../components/FreePlanAdModal';
import { PlatformBadgeIcon, VerifiedBlueTick } from '../components/PlatformIcon';
import { QrModal } from '../components/QrModal';
import { TipModal } from '../components/TipModal';
import { apiFetch, type PublicBioResponse } from '../lib/api';
import { isProActive, parseSpotifyEmbed, parseYouTubeEmbed, THEMES } from '../shared/platforms';

export default function PublicBioPage() {
  const { username = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [data, setData] = useState<PublicBioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [adConfig, setAdConfig] = useState<{ adsEnabled: boolean; adCode: string } | null>(null);
  const [pendingLink, setPendingLink] = useState<{ id: string; title: string; url: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    setAdConfig(null);
    setPendingLink(null);
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

  const { profile, links } = data;
  const theme = THEMES[profile.theme] || THEMES.light;
  const ytEmbed = parseYouTubeEmbed(profile.youtube_url);
  const spotifyEmbed = parseSpotifyEmbed(profile.spotify_url);
  const whatsappClean = (profile.whatsapp_number || '').replace(/[^0-9]/g, '');
  const hasActivePro =
    Boolean(profile.is_pro) &&
    (profile.pro_expires_at
      ? isProActive(profile.is_pro, profile.pro_expires_at)
      : profile.show_watermark === false);
  const showWatermark = !hasActivePro;

  return (
    <div className={`min-h-screen ${theme.pageBg} py-8 px-4 flex flex-col items-center transition-colors`}>
      <main className="w-full max-w-[460px] mx-auto">
        <div className={`rounded-3xl p-6 sm:p-7 ${theme.cardBg}`}>
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
                className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${theme.linkBg}`}
                aria-label="Show QR Code"
                title="Show QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className={`h-10 px-3 rounded-2xl flex items-center gap-1.5 text-xs font-semibold transition-colors ${theme.linkBg}`}
                aria-label="Share profile link"
              >
                {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                <span>{copiedShare ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <Avatar src={profile.avatar_url} name={profile.name} sizeClass="h-24 w-24" />
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

          {/* Tip Jar CTA + Optional WhatsApp Quick Chat */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setTipOpen(true)}
              className="flex-1 h-12 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
            >
              <HeartHandshake className="h-4 w-4" />
              Support Me
            </button>
            {whatsappClean && (
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`h-12 px-4 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${theme.linkBg}`}
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                WhatsApp
              </a>
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
              <p className={`text-center text-sm py-6 ${theme.textMuted}`}>No links added yet.</p>
            ) : (
              links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleCreatorLinkAction(e, link, hasActivePro, profile.username)}
                  className={`group flex items-center gap-3.5 p-3 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] ${theme.linkBg}`}
                >
                  <PlatformBadgeIcon platform={link.platform} />
                  <span className="flex-1 text-sm font-semibold truncate">{link.title}</span>
                  <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 shrink-0 transition-opacity" />
                </a>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Conditional Watermark: Shown ONLY for Free / Expired Pro */}
      {showWatermark && (
        <footer className="mt-6 pb-4 text-center w-full max-w-[460px] mx-auto">
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
