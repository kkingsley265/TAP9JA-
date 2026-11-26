import type { PlatformId, ProductType, ThemeId } from '../shared/platforms';

export interface PublicConfig {
  paystackPublicKey: string;
  paystackConfigured: boolean;
  paystackMode?: 'live' | 'test' | 'unknown';
  paystackKeyMismatch?: boolean;
  proPriceNgn: number;
  proPriceKobo: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  bio: string;
  avatar_url: string;
  youtube_url: string;
  spotify_url: string;
  whatsapp_number: string;
  theme: ThemeId;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_pro: boolean;
  pro_expires_at: string | null;
  pending_balance_kobo: number;
  total_earnings_kobo: number;
  total_views: number;
  is_blocked: boolean;
  payout_requested_at: string | null;
  created_at: string;
}

export interface CreatorLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  platform: PlatformId;
  is_active: boolean;
  position: number;
  clicks: number;
  created_at: string;
}

export interface PlanNotice {
  hadExpiredPro: boolean;
  hiddenLinksCount: number;
  hiddenProductsCount: number;
  revertedTheme: boolean;
}

export interface CreatorProduct {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  price_kobo: number;
  product_type: ProductType;
  cover_url: string;
  external_url: string;
  is_active: boolean;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicProduct {
  id: string;
  title: string;
  description: string;
  price_kobo: number;
  product_type: ProductType;
  cover_url: string;
  sales_count: number;
}

export interface ProductSaleRecord {
  id: string;
  product_id: string;
  product_title: string;
  product_type: ProductType;
  buyer_email_masked: string;
  amount_kobo: number;
  commission_kobo: number;
  net_kobo: number;
  paystack_reference: string;
  created_at: string;
}

export interface PublicBioResponse {
  profile: {
    username: string;
    name: string;
    bio: string;
    avatar_url: string;
    youtube_url: string;
    spotify_url: string;
    whatsapp_number: string;
    theme: ThemeId;
    total_views: number;
    is_pro: boolean;
    pro_expires_at?: string | null;
    verified_tick: boolean;
    show_watermark: boolean;
  };
  links: Array<{
    id: string;
    title: string;
    url: string;
    platform: PlatformId;
    position: number;
    clicks: number;
  }>;
  products?: PublicProduct[];
}

const USER_TOKEN_KEY = 'tap9ja_token';
const ADMIN_TOKEN_KEY = 'tap9ja_admin_token';

export function getUserToken(): string | null {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token: string | null): void {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { authMode?: 'user' | 'admin' | 'none' } = {}
): Promise<T> {
  const { authMode = 'user', headers, ...rest } = options;
  const reqHeaders = new Headers(headers);
  if (!reqHeaders.has('Content-Type') && rest.body) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (authMode === 'user') {
    const t = getUserToken();
    if (t) reqHeaders.set('Authorization', `Bearer ${t}`);
  } else if (authMode === 'admin') {
    const t = getAdminToken();
    if (t) reqHeaders.set('Authorization', `Bearer ${t}`);
  }

  const res = await fetch(path, { cache: 'no-store', ...rest, headers: reqHeaders });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export function openPaystackPopup(params: {
  publicKey: string;
  email: string;
  amountKobo: number;
  referencePrefix?: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onCancel?: (reference: string) => void;
  onError: (msg: string) => void;
}) {
  if (!params.publicKey) {
    params.onError(
      'Paystack is not configured yet. Add PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY in Cloudflare Environment Variables.'
    );
    return;
  }
  if (!window.PaystackPop) {
    params.onError('Paystack checkout script is still loading or blocked. Please disable adblockers and try again.');
    return;
  }

  const prefix = (params.referencePrefix || 'T9J').replace(/[^a-zA-Z0-9_-]/g, '');
  const reference = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const handler = window.PaystackPop.setup({
    key: params.publicKey,
    email: params.email,
    amount: Math.round(params.amountKobo),
    currency: 'NGN',
    ref: reference,
    metadata: params.metadata,
    callback: (response) => {
      params.onSuccess(response.reference || reference);
    },
    onClose: () => {
      params.onCancel?.(reference);
    },
  });
  handler.openIframe();
}
