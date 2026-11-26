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
      if (parsed.pathname.startsWith('/live/')) {
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

export type ProductType = 'video' | 'audio' | 'file' | 'community';

export interface ProductTypeMeta {
  id: ProductType;
  label: string;
  shortLabel: string;
  actionLabel: string;
  placeholderUrl: string;
}

export const PRODUCT_TYPES: Record<ProductType, ProductTypeMeta> = {
  video: {
    id: 'video',
    label: 'Video / Course (YouTube, Loom, Vimeo)',
    shortLabel: 'Video',
    actionLabel: 'Watch Video',
    placeholderUrl: 'https://youtu.be/... or https://www.loom.com/share/...',
  },
  audio: {
    id: 'audio',
    label: 'Music / Audio (Spotify, SoundCloud, Drive)',
    shortLabel: 'Audio',
    actionLabel: 'Listen Now',
    placeholderUrl: 'https://open.spotify.com/track/... or https://drive.google.com/...',
  },
  file: {
    id: 'file',
    label: 'File / Ebook / Template (Drive, Canva, Notion)',
    shortLabel: 'File / Ebook',
    actionLabel: 'Download / Open File',
    placeholderUrl: 'https://drive.google.com/file/d/... or https://canva.com/...',
  },
  community: {
    id: 'community',
    label: 'Private Group / Coaching (Telegram, WhatsApp, Calendly)',
    shortLabel: 'Group / Call',
    actionLabel: 'Join / Book Access',
    placeholderUrl: 'https://t.me/+... or https://chat.whatsapp.com/...',
  },
};

export function parseProductEmbed(
  productType: ProductType,
  externalUrl: string
): { embedType: 'iframe' | 'none'; embedUrl: string | null; height?: number } {
  const url = (externalUrl || '').trim();
  if (!url) return { embedType: 'none', embedUrl: null };

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (productType === 'video') {
      const yt = parseYouTubeEmbed(url);
      if (yt) return { embedType: 'iframe', embedUrl: yt };

      if (host === 'loom.com' || host.endsWith('.loom.com')) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if ((parts[0] === 'share' || parts[0] === 'embed') && parts[1]) {
          return { embedType: 'iframe', embedUrl: `https://www.loom.com/embed/${parts[1]}` };
        }
      }

      if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        const videoId = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
        if (videoId && /^\d+$/.test(videoId)) {
          return { embedType: 'iframe', embedUrl: `https://player.vimeo.com/video/${videoId}` };
        }
      }

      if (host === 'drive.google.com') {
        const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
        if (match?.[1]) {
          return { embedType: 'iframe', embedUrl: `https://drive.google.com/file/d/${match[1]}/preview` };
        }
      }
    }

    if (productType === 'audio') {
      const sp = parseSpotifyEmbed(url);
      if (sp) return { embedType: 'iframe', embedUrl: sp, height: 152 };

      if (host === 'soundcloud.com' || host === 'm.soundcloud.com') {
        return {
          embedType: 'iframe',
          embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23059669&auto_play=false&show_teaser=true`,
          height: 166,
        };
      }

      const yt = parseYouTubeEmbed(url);
      if (yt) return { embedType: 'iframe', embedUrl: yt };
    }
  } catch {
    return { embedType: 'none', embedUrl: null };
  }

  return { embedType: 'none', embedUrl: null };
}

export type ThemeId =
  | 'free_theme_1'
  | 'free_theme_2'
  | 'selar_style'
  | 'gumroad_style'
  | 'shopify_neon'
  | 'instagram_luxury'
  | 'stripe_professional';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tag: 'FREE' | 'PREMIUM';
  description: string;
  proOnly: boolean;
  previewGradient: string;
  pageBg: string;
  cardBg: string;
  headerBanner?: string;
  linkBg: string;
  productCardBg: string;
  ctaBg: string;
  textPrimary: string;
  textMuted: string;
  priceColor: string;
  badgeBg: string;
  avatarRing: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  free_theme_1: {
    id: 'free_theme_1',
    name: 'Basic Ugly',
    tag: 'FREE',
    description: 'Plain flat white box with basic borders',
    proOnly: false,
    previewGradient: 'from-white via-gray-100 to-gray-200',
    pageBg: 'bg-gray-100 text-gray-900 font-sans',
    cardBg: 'bg-white border border-gray-300 rounded-md shadow-none',
    linkBg: 'bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-900 rounded-md',
    productCardBg: 'bg-gray-50 border border-gray-300 rounded-md',
    ctaBg: 'bg-gray-800 hover:bg-gray-700 text-white rounded-md',
    textPrimary: 'text-gray-900',
    textMuted: 'text-gray-500',
    priceColor: 'text-emerald-700',
    badgeBg: 'bg-gray-200 text-gray-700',
    avatarRing: 'ring-1 ring-gray-300',
  },
  free_theme_2: {
    id: 'free_theme_2',
    name: 'Simple Slate',
    tag: 'FREE',
    description: 'Plain light slate box — clean but basic',
    proOnly: false,
    previewGradient: 'from-slate-200 via-slate-100 to-slate-200',
    pageBg: 'bg-slate-200 text-slate-900 font-sans',
    cardBg: 'bg-slate-50 border border-slate-300 rounded-2xl shadow-sm',
    linkBg: 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl',
    productCardBg: 'bg-white border border-slate-300 rounded-xl',
    ctaBg: 'bg-slate-900 hover:bg-slate-800 text-white rounded-xl',
    textPrimary: 'text-slate-900',
    textMuted: 'text-slate-500',
    priceColor: 'text-emerald-700',
    badgeBg: 'bg-slate-200 text-slate-700',
    avatarRing: 'ring-2 ring-slate-300',
  },
  selar_style: {
    id: 'selar_style',
    name: 'Selar Style',
    tag: 'PREMIUM',
    description: 'TAP9JA emerald-purple energy with glassmorphism & soft depth',
    proOnly: true,
    previewGradient: 'from-emerald-700 via-teal-700 to-purple-800',
    pageBg: 'bg-gradient-to-br from-[#042f2e] via-[#0f172a] to-[#3b0764] text-white',
    cardBg: 'bg-white/[0.09] backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-emerald-950/60',
    linkBg: 'bg-white/10 hover:bg-emerald-400/20 border border-white/15 text-white rounded-2xl',
    productCardBg: 'bg-white/10 border border-emerald-300/25 rounded-2xl backdrop-blur-md',
    ctaBg: 'bg-gradient-to-r from-emerald-500 to-purple-600 hover:opacity-95 text-white rounded-2xl shadow-lg shadow-emerald-950/40',
    textPrimary: 'text-white',
    textMuted: 'text-emerald-100/75',
    priceColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-400/20 text-emerald-100',
    avatarRing: 'ring-4 ring-emerald-400/50 shadow-lg shadow-emerald-500/20',
  },
  gumroad_style: {
    id: 'gumroad_style',
    name: 'Gumroad Style',
    tag: 'PREMIUM',
    description: 'Crisp editorial cream & ink with bold high-contrast offset cards',
    proOnly: true,
    previewGradient: 'from-amber-100 via-stone-100 to-zinc-900',
    pageBg: 'bg-[#f4f1ea] text-zinc-950',
    cardBg: 'bg-[#fffdf8] border-2 border-zinc-950 rounded-3xl shadow-[6px_6px_0px_0px_#09090b]',
    linkBg: 'bg-white hover:bg-amber-200/70 border-2 border-zinc-950 text-zinc-950 rounded-2xl shadow-[3px_3px_0px_0px_#09090b]',
    productCardBg: 'bg-[#fff8e7] border-2 border-zinc-950 rounded-2xl shadow-[3px_3px_0px_0px_#09090b]',
    ctaBg: 'bg-zinc-950 hover:bg-emerald-700 text-white rounded-2xl shadow-[3px_3px_0px_0px_#10b981]',
    textPrimary: 'text-zinc-950',
    textMuted: 'text-zinc-600',
    priceColor: 'text-emerald-700',
    badgeBg: 'bg-zinc-950 text-amber-200',
    avatarRing: 'ring-2 ring-zinc-950',
  },
  shopify_neon: {
    id: 'shopify_neon',
    name: 'Shopify Neon',
    tag: 'PREMIUM',
    description: 'Obsidian night canvas with electric emerald & cyan glow',
    proOnly: true,
    previewGradient: 'from-zinc-950 via-emerald-950 to-cyan-950',
    pageBg: 'bg-[#05070d] bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.22),transparent_60%)] text-zinc-50',
    cardBg: 'bg-zinc-900/90 backdrop-blur-2xl border border-emerald-400/30 rounded-3xl shadow-2xl shadow-emerald-500/15',
    linkBg: 'bg-zinc-800/80 hover:bg-emerald-500/15 border border-emerald-400/25 text-white rounded-2xl',
    productCardBg: 'bg-zinc-950/85 border border-emerald-400/35 rounded-2xl shadow-lg shadow-emerald-500/10',
    ctaBg: 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-95 text-zinc-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/25',
    textPrimary: 'text-white',
    textMuted: 'text-zinc-400',
    priceColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
    avatarRing: 'ring-4 ring-emerald-400/60 shadow-lg shadow-emerald-500/30',
  },
  instagram_luxury: {
    id: 'instagram_luxury',
    name: 'Instagram Luxury',
    tag: 'PREMIUM',
    description: 'Luminous sunset cover banner, story-ring avatar & silk cards',
    proOnly: true,
    previewGradient: 'from-fuchsia-700 via-rose-600 to-amber-500',
    pageBg: 'bg-gradient-to-b from-[#2b092f] via-[#1c0f24] to-[#0f172a] text-white',
    cardBg: 'bg-white/[0.08] backdrop-blur-2xl border border-rose-300/25 rounded-3xl shadow-2xl shadow-fuchsia-950/60 overflow-hidden',
    headerBanner: 'bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400',
    linkBg: 'bg-white/10 hover:bg-rose-400/20 border border-white/15 text-white rounded-2xl',
    productCardBg: 'bg-white/10 border border-amber-300/25 rounded-2xl backdrop-blur-md',
    ctaBg: 'bg-gradient-to-r from-rose-500 via-fuchsia-600 to-amber-500 hover:opacity-95 text-white rounded-2xl shadow-lg shadow-rose-950/40',
    textPrimary: 'text-white',
    textMuted: 'text-rose-100/80',
    priceColor: 'text-emerald-300',
    badgeBg: 'bg-rose-400/25 text-rose-100',
    avatarRing: 'ring-4 ring-amber-300/80 shadow-xl shadow-rose-500/30',
  },
  stripe_professional: {
    id: 'stripe_professional',
    name: 'Stripe Professional',
    tag: 'PREMIUM',
    description: 'Executive indigo-slate finish with precision hairline surfaces',
    proOnly: true,
    previewGradient: 'from-indigo-950 via-slate-900 to-emerald-950',
    pageBg: 'bg-gradient-to-br from-slate-50 via-indigo-50/60 to-emerald-50/50 text-slate-950',
    cardBg: 'bg-white/95 backdrop-blur-xl border border-indigo-200/80 rounded-3xl shadow-2xl shadow-indigo-950/10',
    linkBg: 'bg-slate-50/90 hover:bg-indigo-50 border border-slate-200/90 text-slate-900 rounded-2xl shadow-sm',
    productCardBg: 'bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-200/80 rounded-2xl shadow-sm',
    ctaBg: 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:opacity-95 text-white rounded-2xl shadow-md shadow-indigo-600/20',
    textPrimary: 'text-slate-950',
    textMuted: 'text-slate-500',
    priceColor: 'text-emerald-700',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    avatarRing: 'ring-4 ring-indigo-500/25 shadow-md',
  },
};

export const FREE_THEME_IDS: ThemeId[] = ['free_theme_1', 'free_theme_2'];
export const PRO_THEME_IDS: ThemeId[] = [
  'selar_style',
  'gumroad_style',
  'shopify_neon',
  'instagram_luxury',
  'stripe_professional',
];

const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  light: 'free_theme_1',
  dark: 'free_theme_2',
  naija_green: 'selar_style',
  purple_hustle: 'instagram_luxury',
  sunset: 'shopify_neon',
};

export function normalizeThemeKey(rawTheme: string | null | undefined): ThemeId {
  const key = (rawTheme || '').trim();
  if (key in THEMES) return key as ThemeId;
  if (key in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[key];
  return 'free_theme_1';
}

export function resolveThemeId(rawTheme: string | null | undefined, activePro: boolean): ThemeId {
  const normalized = normalizeThemeKey(rawTheme);
  if (activePro) {
    return normalized;
  }
  // When Free or Expired Pro: only free_theme_2 is preserved if explicitly free_theme_2 (or legacy free 'dark');
  // any Pro theme (or missing/expired) reverts automatically to Free Theme 1 (Basic Ugly).
  if (normalized === 'free_theme_2') {
    return 'free_theme_2';
  }
  return 'free_theme_1';
}

export function isPremiumTheme(themeId: string | null | undefined): boolean {
  const normalized = normalizeThemeKey(themeId);
  return Boolean(THEMES[normalized]?.proOnly);
}

export function maskEmail(rawEmail: string | null | undefined): string {
  const email = (rawEmail || '').trim();
  if (!email || !email.includes('@')) return 'Anonymous buyer';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

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
