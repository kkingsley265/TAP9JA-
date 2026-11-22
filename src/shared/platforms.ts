export type PlatformId =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'youtube'
  | 'spotify'
  | 'apple_music'
  | 'boomplay'
  | 'audiomack'
  | 'soundcloud'
  | 'whatsapp'
  | 'telegram'
  | 'website'
  | 'shop'
  | 'email'
  | 'phone'
  | 'booking'
  | 'custom';

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  accentBg: string;
  accentText: string;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  instagram: { id: 'instagram', label: 'Instagram', accentBg: 'bg-pink-500/15', accentText: 'text-pink-500' },
  tiktok: { id: 'tiktok', label: 'TikTok', accentBg: 'bg-slate-900/15', accentText: 'text-slate-900' },
  facebook: { id: 'facebook', label: 'Facebook', accentBg: 'bg-blue-600/15', accentText: 'text-blue-600' },
  twitter: { id: 'twitter', label: 'X / Twitter', accentBg: 'bg-sky-500/15', accentText: 'text-sky-500' },
  youtube: { id: 'youtube', label: 'YouTube', accentBg: 'bg-red-500/15', accentText: 'text-red-500' },
  spotify: { id: 'spotify', label: 'Spotify', accentBg: 'bg-emerald-500/15', accentText: 'text-emerald-500' },
  apple_music: { id: 'apple_music', label: 'Apple Music', accentBg: 'bg-rose-500/15', accentText: 'text-rose-500' },
  boomplay: { id: 'boomplay', label: 'Boomplay', accentBg: 'bg-teal-500/15', accentText: 'text-teal-500' },
  audiomack: { id: 'audiomack', label: 'Audiomack', accentBg: 'bg-amber-500/15', accentText: 'text-amber-500' },
  soundcloud: { id: 'soundcloud', label: 'SoundCloud', accentBg: 'bg-orange-500/15', accentText: 'text-orange-500' },
  whatsapp: { id: 'whatsapp', label: 'WhatsApp', accentBg: 'bg-green-500/15', accentText: 'text-green-600' },
  telegram: { id: 'telegram', label: 'Telegram', accentBg: 'bg-cyan-500/15', accentText: 'text-cyan-600' },
  website: { id: 'website', label: 'Website', accentBg: 'bg-indigo-500/15', accentText: 'text-indigo-500' },
  shop: { id: 'shop', label: 'Online Shop', accentBg: 'bg-purple-500/15', accentText: 'text-purple-500' },
  email: { id: 'email', label: 'Email', accentBg: 'bg-violet-500/15', accentText: 'text-violet-500' },
  phone: { id: 'phone', label: 'Phone Call', accentBg: 'bg-emerald-600/15', accentText: 'text-emerald-600' },
  booking: { id: 'booking', label: 'Booking', accentBg: 'bg-fuchsia-500/15', accentText: 'text-fuchsia-500' },
  custom: { id: 'custom', label: 'Custom Link', accentBg: 'bg-slate-500/15', accentText: 'text-slate-600' },
};

export function detectPlatform(rawUrl: string): PlatformId {
  const url = (rawUrl || '').trim().toLowerCase();
  if (!url) return 'custom';
  if (url.startsWith('mailto:')) return 'email';
  if (url.startsWith('tel:')) return 'phone';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.me')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('music.apple.com') || url.includes('itunes.apple.com')) return 'apple_music';
  if (url.includes('boomplay.com')) return 'boomplay';
  if (url.includes('audiomack.com')) return 'audiomack';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('wa.me') || url.includes('whatsapp.com')) return 'whatsapp';
  if (url.includes('t.me') || url.includes('telegram.me') || url.includes('telegram.org')) return 'telegram';
  if (
    url.includes('calendly.com') ||
    url.includes('cal.com') ||
    url.includes('tidycal.com') ||
    url.includes('acuityscheduling.com')
  ) {
    return 'booking';
  }
  if (
    url.includes('jumia.') ||
    url.includes('konga.') ||
    url.includes('shopify.') ||
    url.includes('myshopify.com') ||
    url.includes('selar.co') ||
    url.includes('flutterwave.com/store') ||
    url.includes('paystack.shop') ||
    url.includes('bumpa.shop') ||
    url.includes('etsy.com') ||
    url.includes('amazon.') ||
    url.includes('/shop') ||
    url.includes('/store')
  ) {
    return 'shop';
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.includes('.')) {
    return 'website';
  }
  return 'custom';
}

export function normalizeLinkUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  if (/^\+?[0-9\s-]{7,18}$/.test(trimmed)) {
    return `tel:${trimmed.replace(/\s+/g, '')}`;
  }
  return `https://${trimmed}`;
}

export function parseYouTubeEmbed(rawUrl: string): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const listId = parsed.searchParams.get('list');
      const vId = parsed.searchParams.get('v');
      if (vId) return `https://www.youtube.com/embed/${vId}`;
      if (listId) return `https://www.youtube.com/embed/videoseries?list=${listId}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseSpotifyEmbed(rawUrl: string): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'open.spotify.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' && parts[1] && parts[2]) {
      return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
    }
    if (parts.length >= 2 && ['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(parts[0])) {
      return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export type ThemeId = 'light' | 'dark' | 'naija_green' | 'purple_hustle' | 'sunset';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  proOnly: boolean;
  previewGradient: string;
  pageBg: string;
  cardBg: string;
  linkBg: string;
  textPrimary: string;
  textMuted: string;
  badgeBg: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean porcelain white with crisp hairline cards',
    proOnly: false,
    previewGradient: 'from-slate-50 via-white to-emerald-50',
    pageBg: 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/70 text-slate-900',
    cardBg: 'bg-white/85 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-slate-900/5',
    linkBg: 'bg-white hover:bg-emerald-50/70 border border-slate-200 text-slate-900',
    textPrimary: 'text-slate-900',
    textMuted: 'text-slate-500',
    badgeBg: 'bg-slate-100 text-slate-700',
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Deep obsidian canvas with frosted glass links',
    proOnly: false,
    previewGradient: 'from-zinc-950 via-slate-900 to-zinc-950',
    pageBg: 'bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-900 text-zinc-50',
    cardBg: 'bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40',
    linkBg: 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white',
    textPrimary: 'text-white',
    textMuted: 'text-zinc-400',
    badgeBg: 'bg-white/10 text-zinc-200',
  },
  naija_green: {
    id: 'naija_green',
    name: 'Naija Green',
    description: 'Rich Lagos emerald & deep forest glass',
    proOnly: true,
    previewGradient: 'from-emerald-950 via-emerald-800 to-teal-900',
    pageBg: 'bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950 text-white',
    cardBg: 'bg-emerald-950/65 backdrop-blur-xl border border-emerald-400/20 shadow-2xl shadow-emerald-950/60',
    linkBg: 'bg-white/10 hover:bg-emerald-400/20 border border-emerald-300/20 text-white',
    textPrimary: 'text-white',
    textMuted: 'text-emerald-200/80',
    badgeBg: 'bg-emerald-400/20 text-emerald-100',
  },
  purple_hustle: {
    id: 'purple_hustle',
    name: 'Purple Hustle',
    description: 'Royal violet-emerald gradient energy',
    proOnly: true,
    previewGradient: 'from-purple-950 via-violet-900 to-emerald-950',
    pageBg: 'bg-gradient-to-br from-[#190933] via-[#2e1065] to-[#064e3b] text-white',
    cardBg: 'bg-white/[0.08] backdrop-blur-xl border border-purple-300/20 shadow-2xl shadow-purple-950/60',
    linkBg: 'bg-white/10 hover:bg-purple-400/20 border border-white/15 text-white',
    textPrimary: 'text-white',
    textMuted: 'text-purple-200/80',
    badgeBg: 'bg-purple-400/20 text-purple-100',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm Afrobeats golden-hour plum & amber',
    proOnly: true,
    previewGradient: 'from-orange-950 via-rose-900 to-purple-950',
    pageBg: 'bg-gradient-to-br from-orange-950 via-rose-900 to-purple-950 text-white',
    cardBg: 'bg-black/35 backdrop-blur-xl border border-amber-300/20 shadow-2xl shadow-rose-950/60',
    linkBg: 'bg-white/10 hover:bg-amber-400/20 border border-amber-200/15 text-white',
    textPrimary: 'text-white',
    textMuted: 'text-amber-100/80',
    badgeBg: 'bg-amber-400/20 text-amber-100',
  },
};

export interface NigerianBank {
  code: string;
  name: string;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '999991', name: 'PalmPay' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '035', name: 'Wema Bank (ALAT)' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '076', name: 'Polaris Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
];

export function formatNairaFromKobo(kobo: number): string {
  const naira = (Number(kobo) || 0) / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: naira % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

export function isProActive(
  isPro: number | boolean | string | null | undefined,
  expiresAt: string | null | undefined
): boolean {
  const proEnabled = isPro === true || Number(isPro) === 1;
  if (!proEnabled || !expiresAt) return false;
  const expiryMs = Date.parse(expiresAt);
  return Number.isFinite(expiryMs) && expiryMs > Date.now();
}
