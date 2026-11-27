import {
  detectPlatform,
  isPremiumTheme,
  isProActive,
  maskEmail,
  NIGERIAN_BANKS,
  normalizeLinkUrl,
  normalizeThemeKey,
  parsePreviewEmbed,
  parseProductEmbed,
  PRODUCT_TYPES,
  resolveThemeId,
  THEMES,
  type ProductType,
  type ThemeId,
} from '../../src/shared/platforms.ts';
import {
  generateId,
  generateResetCode,
  hashPassword,
  sha256Hex,
  signJwt,
  verifyJwt,
  verifyPassword,
  verifyPaystackWebhookSignature,
} from './crypto.ts';
import { ensureSchema, type D1DatabaseLike } from './db.ts';

export interface EnvBindings {
  DB: D1DatabaseLike;
  PAYSTACK_PUBLIC_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  PRO_PRICE?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  name: string;
  bio: string;
  avatar_url: string;
  youtube_url: string;
  spotify_url: string;
  whatsapp_number: string;
  theme: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_pro: number;
  pro_expires_at: string | null;
  pending_balance_kobo: number;
  total_earnings_kobo: number;
  total_views: number;
  is_blocked: number;
  payout_requested_at: string | null;
  created_at: string;
}

interface LinkRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  platform: string;
  is_active: number;
  position: number;
  clicks: number;
  created_at: string;
}

interface ProductRow {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  price_kobo: number;
  product_type: string;
  cover_url: string;
  preview_url: string;
  external_url: string;
  is_active: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeUser(row: UserRow) {
  const activePro = isProActive(row.is_pro, row.pro_expires_at);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    youtube_url: row.youtube_url,
    spotify_url: row.spotify_url,
    whatsapp_number: row.whatsapp_number,
    theme: resolveThemeId(row.theme, activePro),
    bank_code: row.bank_code,
    bank_name: row.bank_name,
    account_number: row.account_number,
    account_name: row.account_name,
    is_pro: activePro,
    pro_expires_at: row.pro_expires_at,
    pending_balance_kobo: row.pending_balance_kobo,
    total_earnings_kobo: row.total_earnings_kobo,
    total_views: row.total_views,
    is_blocked: Boolean(row.is_blocked),
    payout_requested_at: row.payout_requested_at,
    created_at: row.created_at,
  };
}

async function syncUserProStatus(db: D1DatabaseLike, user: UserRow): Promise<UserRow> {
  if (user.is_pro === 1 && !isProActive(user.is_pro, user.pro_expires_at)) {
    await db.prepare('UPDATE users SET is_pro = 0 WHERE id = ?').bind(user.id).run();
    return { ...user, is_pro: 0 };
  }
  return user;
}

function getJwtSecret(env: EnvBindings): string {
  if (env.JWT_SECRET && env.JWT_SECRET.trim().length >= 8) {
    return env.JWT_SECRET.trim();
  }
  throw new Error('JWT_SECRET_MISSING');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function parseJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

async function getAuthUser(req: Request, env: EnvBindings): Promise<UserRow | null> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;
  const secret = getJwtSecret(env);
  const payload = await verifyJwt(token, secret);
  if (!payload || payload.role !== 'user') return null;
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first<UserRow>();
  if (!row || row.is_blocked === 1) return null;
  return syncUserProStatus(env.DB, row);
}

async function requireAdmin(req: Request, env: EnvBindings): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;
  const secret = getJwtSecret(env);
  const payload = await verifyJwt(token, secret);
  return Boolean(payload && payload.role === 'admin');
}

function isValidHttpUrl(val: string): boolean {
  if (!val) return true;
  if (val.startsWith('demo:')) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPasswordResetEmailHtml(params: { name: string; code: string; resetUrl: string }): string {
  const safeName = escapeHtml(params.name || 'Creator');
  const safeCode = escapeHtml(params.code);
  const safeUrl = escapeHtml(params.resetUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px;background:linear-gradient(135deg,#059669 0%,#6d28d9 100%);color:#ffffff;">
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">9J TAP9JA</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px;">One Link. All Your Hustle.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Reset your password</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
            Hi ${safeName}, we received a request to reset your TAP9JA account password. Enter the security code below on the reset page:
          </p>
          <div style="margin:0 0 24px;padding:18px 20px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:16px;text-align:center;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Security Code</div>
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:0.22em;color:#0f172a;">${safeCode}</div>
          </div>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;border-radius:16px;background:linear-gradient(135deg,#059669 0%,#6d28d9 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
              Reset Password
            </a>
          </div>
          <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#64748b;">
            This security code expires in <strong>15 minutes</strong> and can only be used once.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
            If you did not request a password reset, you can safely ignore this email. Your account remains secure.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function verifyPaystackTransaction(
  reference: string,
  secretKey: string
): Promise<{
  ok: boolean;
  amountKobo?: number;
  currency?: string;
  status?: string;
  error?: string;
}> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const payload = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      reference?: string;
    };
  };

  if (!res.ok || !payload.status || !payload.data) {
    return { ok: false, error: payload.message || 'Paystack verification failed' };
  }
  if (payload.data.status !== 'success') {
    return { ok: false, error: `Transaction status is ${payload.data.status || 'incomplete'}` };
  }
  if (payload.data.currency && payload.data.currency !== 'NGN') {
    return { ok: false, error: 'Unsupported transaction currency' };
  }
  return {
    ok: true,
    amountKobo: Number(payload.data.amount || 0),
    currency: payload.data.currency || 'NGN',
    status: payload.data.status,
  };
}

function getPaystackKeyMode(key: string): 'live' | 'test' | null {
  if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) return 'live';
  if (key.startsWith('pk_test_') || key.startsWith('sk_test_')) return 'test';
  return null;
}

async function recordVerifiedTip(
  db: D1DatabaseLike,
  params: {
    creator: UserRow;
    reference: string;
    amountKobo: number;
    fromName: string;
    fromEmail: string;
    message: string;
  }
): Promise<{
  status: 'credited' | 'already_credited' | 'conflict';
  amountKobo: number;
  commissionKobo: number;
  netKobo: number;
}> {
  const existingTip = await db
    .prepare('SELECT to_user_id, amount_kobo, commission_kobo, net_kobo FROM tips WHERE paystack_reference = ?')
    .bind(params.reference)
    .first<{ to_user_id: string; amount_kobo: number; commission_kobo: number; net_kobo: number }>();

  if (existingTip) {
    if (existingTip.to_user_id === params.creator.id) {
      return {
        status: 'already_credited',
        amountKobo: Number(existingTip.amount_kobo),
        commissionKobo: Number(existingTip.commission_kobo),
        netKobo: Number(existingTip.net_kobo),
      };
    }
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const existingPro = await db
    .prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingPro) {
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const existingSale = await db
    .prepare('SELECT id FROM product_sales WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingSale) {
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const amountKobo = Math.round(params.amountKobo);
  const commissionKobo = Math.round(amountKobo * 0.1);
  const netKobo = amountKobo - commissionKobo;
  const now = new Date().toISOString();

  const insertRes = await db
    .prepare(
      `INSERT OR IGNORE INTO tips (
        id, to_user_id, to_username, from_name, from_email, message,
        amount_kobo, commission_kobo, net_kobo, paystack_reference, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`
    )
    .bind(
      generateId(),
      params.creator.id,
      params.creator.username,
      params.fromName,
      params.fromEmail,
      params.message,
      amountKobo,
      commissionKobo,
      netKobo,
      params.reference,
      now
    )
    .run();

  if ((insertRes.meta?.changes ?? 0) === 0) {
    const raced = await db
      .prepare('SELECT to_user_id, amount_kobo, commission_kobo, net_kobo FROM tips WHERE paystack_reference = ?')
      .bind(params.reference)
      .first<{ to_user_id: string; amount_kobo: number; commission_kobo: number; net_kobo: number }>();
    if (raced && raced.to_user_id === params.creator.id) {
      return {
        status: 'already_credited',
        amountKobo: Number(raced.amount_kobo),
        commissionKobo: Number(raced.commission_kobo),
        netKobo: Number(raced.net_kobo),
      };
    }
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  await db
    .prepare(
      `UPDATE users SET
        pending_balance_kobo = pending_balance_kobo + ?,
        total_earnings_kobo = total_earnings_kobo + ?
       WHERE id = ?`
    )
    .bind(netKobo, netKobo, params.creator.id)
    .run();

  return { status: 'credited', amountKobo, commissionKobo, netKobo };
}

async function recordVerifiedPro(
  db: D1DatabaseLike,
  params: {
    user: UserRow;
    reference: string;
    amountKobo: number;
  }
): Promise<{
  status: 'credited' | 'already_credited' | 'conflict';
  expiresAt: string;
  user: UserRow | null;
}> {
  const existingPro = await db
    .prepare('SELECT user_id, expires_at FROM pro_payments WHERE paystack_reference = ?')
    .bind(params.reference)
    .first<{ user_id: string; expires_at: string }>();

  if (existingPro) {
    if (existingPro.user_id === params.user.id) {
      const freshUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(params.user.id).first<UserRow>();
      return { status: 'already_credited', expiresAt: existingPro.expires_at, user: freshUser };
    }
    return { status: 'conflict', expiresAt: '', user: null };
  }

  const existingTip = await db
    .prepare('SELECT id FROM tips WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingTip) {
    return { status: 'conflict', expiresAt: '', user: null };
  }

  const existingSale = await db
    .prepare('SELECT id FROM product_sales WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingSale) {
    return { status: 'conflict', expiresAt: '', user: null };
  }

  const nowMs = Date.now();
  const existingExpiryMs = params.user.pro_expires_at ? new Date(params.user.pro_expires_at).getTime() : 0;
  const baseMs =
    isProActive(params.user.is_pro, params.user.pro_expires_at) && existingExpiryMs > nowMs ? existingExpiryMs : nowMs;
  const newExpiry = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(nowMs).toISOString();

  const insertRes = await db
    .prepare(
      `INSERT OR IGNORE INTO pro_payments (id, user_id, username, amount_kobo, paystack_reference, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      params.user.id,
      params.user.username,
      Math.round(params.amountKobo),
      params.reference,
      newExpiry,
      nowIso
    )
    .run();

  if ((insertRes.meta?.changes ?? 0) === 0) {
    const raced = await db
      .prepare('SELECT user_id, expires_at FROM pro_payments WHERE paystack_reference = ?')
      .bind(params.reference)
      .first<{ user_id: string; expires_at: string }>();
    if (raced && raced.user_id === params.user.id) {
      const freshUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(params.user.id).first<UserRow>();
      return { status: 'already_credited', expiresAt: raced.expires_at, user: freshUser };
    }
    return { status: 'conflict', expiresAt: '', user: null };
  }

  await db
    .prepare('UPDATE users SET is_pro = 1, pro_expires_at = ? WHERE id = ?')
    .bind(newExpiry, params.user.id)
    .run();

  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').bind(params.user.id).first<UserRow>();
  return { status: 'credited', expiresAt: newExpiry, user: updated };
}

async function recordVerifiedProductSale(
  db: D1DatabaseLike,
  params: {
    product: ProductRow;
    seller: UserRow;
    reference: string;
    amountKobo: number;
    buyerEmail: string;
  }
): Promise<{
  status: 'credited' | 'already_credited' | 'conflict';
  amountKobo: number;
  commissionKobo: number;
  netKobo: number;
}> {
  const existingSale = await db
    .prepare(
      'SELECT product_id, seller_id, amount_kobo, commission_kobo, net_kobo FROM product_sales WHERE paystack_reference = ?'
    )
    .bind(params.reference)
    .first<{
      product_id: string;
      seller_id: string;
      amount_kobo: number;
      commission_kobo: number;
      net_kobo: number;
    }>();

  if (existingSale) {
    if (existingSale.product_id === params.product.id && existingSale.seller_id === params.seller.id) {
      return {
        status: 'already_credited',
        amountKobo: Number(existingSale.amount_kobo),
        commissionKobo: Number(existingSale.commission_kobo),
        netKobo: Number(existingSale.net_kobo),
      };
    }
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const existingTip = await db
    .prepare('SELECT id FROM tips WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingTip) {
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const existingPro = await db
    .prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?')
    .bind(params.reference)
    .first();
  if (existingPro) {
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  const amountKobo = Math.round(params.amountKobo);
  const commissionKobo = Math.round(amountKobo * 0.1);
  const netKobo = amountKobo - commissionKobo;
  const now = new Date().toISOString();

  const insertRes = await db
    .prepare(
      `INSERT OR IGNORE INTO product_sales (
        id, product_id, product_title, product_type, seller_id, seller_username, buyer_email,
        amount_kobo, commission_kobo, net_kobo, paystack_reference, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`
    )
    .bind(
      generateId(),
      params.product.id,
      params.product.title,
      params.product.product_type,
      params.seller.id,
      params.seller.username,
      params.buyerEmail,
      amountKobo,
      commissionKobo,
      netKobo,
      params.reference,
      now
    )
    .run();

  if ((insertRes.meta?.changes ?? 0) === 0) {
    const raced = await db
      .prepare(
        'SELECT product_id, seller_id, amount_kobo, commission_kobo, net_kobo FROM product_sales WHERE paystack_reference = ?'
      )
      .bind(params.reference)
      .first<{
        product_id: string;
        seller_id: string;
        amount_kobo: number;
        commission_kobo: number;
        net_kobo: number;
      }>();
    if (raced && raced.product_id === params.product.id && raced.seller_id === params.seller.id) {
      return {
        status: 'already_credited',
        amountKobo: Number(raced.amount_kobo),
        commissionKobo: Number(raced.commission_kobo),
        netKobo: Number(raced.net_kobo),
      };
    }
    return { status: 'conflict', amountKobo: 0, commissionKobo: 0, netKobo: 0 };
  }

  await db
    .prepare('UPDATE products SET sales_count = sales_count + 1 WHERE id = ?')
    .bind(params.product.id)
    .run();

  await db
    .prepare(
      `UPDATE users SET
        pending_balance_kobo = pending_balance_kobo + ?,
        total_earnings_kobo = total_earnings_kobo + ?
       WHERE id = ?`
    )
    .bind(netKobo, netKobo, params.seller.id)
    .run();

  return { status: 'credited', amountKobo, commissionKobo, netKobo };
}

export async function handleApiRequest(req: Request, env: EnvBindings): Promise<Response> {
  try {
    await ensureSchema(env.DB);
  } catch (err) {
    console.error('Database initialization failed:', err);
    return jsonResponse({ error: 'Database initialization error' }, 500);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const proPriceNgn = Math.max(100, Number(env.PRO_PRICE || 1000) || 1000);

  // Public runtime config (exposes ONLY Paystack public key, never secret keys)
  if (method === 'GET' && path === '/api/config') {
    const publicKey = (env.PAYSTACK_PUBLIC_KEY || '').trim();
    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    const hasSecret = Boolean(secretKey);
    const pkMode = getPaystackKeyMode(publicKey);
    const skMode = getPaystackKeyMode(secretKey);
    const paystackKeyMismatch = Boolean(pkMode && skMode && pkMode !== skMode);
    return jsonResponse({
      paystackPublicKey: publicKey,
      paystackConfigured: Boolean(publicKey && hasSecret && !paystackKeyMismatch),
      paystackMode: pkMode || 'unknown',
      paystackKeyMismatch,
      proPriceNgn,
      proPriceKobo: proPriceNgn * 100,
    });
  }

  // Public Free-Plan Ad Config (read-only settings stored by admin; never exposes admin secrets)
  if (method === 'GET' && path === '/api/ads/config') {
    const enabledRow = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'ads_enabled'")
      .first<{ value: string }>();
    const adsEnabled = enabledRow?.value === '1' || enabledRow?.value === 'true';
    if (!adsEnabled) {
      return jsonResponse({ adsEnabled: false, adCode: '' });
    }
    const codeRow = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'ad_code'")
      .first<{ value: string }>();
    return jsonResponse({
      adsEnabled: true,
      adCode: codeRow?.value || '',
    });
  }

  // Live username availability check
  if (method === 'GET' && path === '/api/auth/check-username') {
    const raw = (url.searchParams.get('username') || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(raw)) {
      return jsonResponse({
        available: false,
        reason: 'Use 3–20 lowercase letters, numbers, or underscores (no spaces).',
      });
    }
    const reserved = ['admin', 'login', 'register', 'dashboard', 'api', 'pricing', 'terms', 'privacy'];
    if (reserved.includes(raw)) {
      return jsonResponse({ available: false, reason: 'This username is reserved.' });
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(raw).first();
    return jsonResponse({
      available: !existing,
      reason: existing ? 'Username is already taken.' : null,
    });
  }

  // Register
  if (method === 'POST' && path === '/api/auth/register') {
    const body = await parseJsonBody<{
      username?: string;
      email?: string;
      password?: string;
      name?: string;
    }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const username = (body.username || '').trim().toLowerCase();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return jsonResponse(
        { error: 'Username must be 3–20 lowercase letters, numbers, or underscores with no spaces.' },
        400
      );
    }
    const reserved = ['admin', 'login', 'register', 'dashboard', 'api', 'pricing', 'terms', 'privacy'];
    if (reserved.includes(username)) {
      return jsonResponse({ error: 'That username is reserved. Please pick another.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
    }
    if (name.length < 2) {
      return jsonResponse({ error: 'Please enter your display name.' }, 400);
    }

    const existingUser = await env.DB.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?')
      .bind(username, email)
      .first<{ id: string; username: string; email: string }>();

    if (existingUser) {
      if (existingUser.username === username) {
        return jsonResponse({ error: 'This username is already taken.' }, 409);
      }
      return jsonResponse({ error: 'An account with this email already exists.' }, 409);
    }

    let secret: string;
    try {
      secret = getJwtSecret(env);
    } catch {
      return jsonResponse({ error: 'Server JWT_SECRET is not configured in environment variables.' }, 500);
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO users (id, username, email, password_hash, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, username, email, passwordHash, name, now)
      .run();

    const created = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
    const token = await signJwt({ sub: id, role: 'user', email, username }, secret);

    return jsonResponse({ token, user: created ? sanitizeUser(created) : null }, 201);
  }

  // Login
  if (method === 'POST' && path === '/api/auth/login') {
    const body = await parseJsonBody<{ email?: string; password?: string }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required.' }, 400);
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return jsonResponse({ error: 'Invalid email or password.' }, 401);
    }
    if (user.is_blocked === 1) {
      return jsonResponse({ error: 'This account has been suspended. Contact support.' }, 403);
    }

    let secret: string;
    try {
      secret = getJwtSecret(env);
    } catch {
      return jsonResponse({ error: 'Server JWT_SECRET is not configured in environment variables.' }, 500);
    }

    const synced = await syncUserProStatus(env.DB, user);
    const token = await signJwt({ sub: synced.id, role: 'user', email: synced.email, username: synced.username }, secret);
    return jsonResponse({ token, user: sanitizeUser(synced) });
  }

  // Forgot Password (self-service email security code via Resend)
  if (method === 'POST' && path === '/api/auth/forgot-password') {
    const resendKey = (env.RESEND_API_KEY || '').trim();
    if (!resendKey) {
      return jsonResponse({ error: 'Password reset email service (RESEND_API_KEY) is not configured.' }, 500);
    }

    const body = await parseJsonBody<{ email?: string }>(req);
    const email = (body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }

    const genericSuccess = {
      ok: true,
      message: 'If an account exists for that email, we sent a 6-digit security code and reset link.',
    };

    // Rate-limit per email (60s cooldown & max 3 requests per 15 mins) before revealing anything
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const rateRow = await env.DB.prepare(
      'SELECT COUNT(*) as cnt, MAX(created_at) as last_created FROM password_resets WHERE email = ? AND created_at > ?'
    )
      .bind(email, fifteenMinsAgo)
      .first<{ cnt: number; last_created: string | null }>();

    if ((rateRow?.cnt ?? 0) >= 3) {
      return jsonResponse(genericSuccess);
    }
    if (rateRow?.last_created && Date.now() - Date.parse(rateRow.last_created) < 60 * 1000) {
      return jsonResponse(genericSuccess);
    }

    const user = await env.DB.prepare('SELECT id, email, name, is_blocked FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; is_blocked: number }>();

    if (!user || user.is_blocked === 1) {
      return jsonResponse(genericSuccess);
    }

    // Invalidate any prior unused reset codes for this user
    await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0')
      .bind(user.id)
      .run();

    const resetId = generateId();
    const code = generateResetCode();
    const codeHash = await sha256Hex(`${resetId}:${code}`);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await env.DB.prepare(
      `INSERT INTO password_resets (id, user_id, email, code_hash, attempts, used, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
    )
      .bind(resetId, user.id, user.email, codeHash, expiresAt, nowIso)
      .run();

    const rawAppUrl = (env.APP_URL || '').trim();
    const baseOrigin =
      rawAppUrl && /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl.replace(/\/+$/, '') : new URL(req.url).origin;
    const resetUrl = `${baseOrigin}/reset-password?email=${encodeURIComponent(user.email)}`;

    const rawFrom = (env.RESEND_FROM_EMAIL || 'nkemjika@tap9ja.com.ng').trim() || 'nkemjika@tap9ja.com.ng';
    const fromHeader = rawFrom.includes('<') ? rawFrom : `TAP9JA <${rawFrom}>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [user.email],
        subject: `Your TAP9JA password reset code: ${code}`,
        html: buildPasswordResetEmailHtml({ name: user.name, code, resetUrl }),
        text: `Hi ${user.name},\n\nYour TAP9JA password reset security code is: ${code}\n\nReset your password here: ${resetUrl}\n\nThis code expires in 15 minutes and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => '');
      console.error('Resend API error:', resendRes.status, errText);
      await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(resetId).run();
      return jsonResponse({ error: 'Failed to deliver reset email. Please try again in a moment.' }, 502);
    }

    return jsonResponse(genericSuccess);
  }

  // Reset Password (one-time code verification + PBKDF2 password update)
  if (method === 'POST' && path === '/api/auth/reset-password') {
    const body = await parseJsonBody<{
      email?: string;
      code?: string;
      newPassword?: string;
      confirmPassword?: string;
    }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const email = (body.email || '').trim().toLowerCase();
    const code = (body.code || '').trim();
    const newPassword = body.newPassword || '';
    const confirmPassword = body.confirmPassword;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }
    if (!/^\d{6}$/.test(code)) {
      return jsonResponse({ error: 'Please enter the 6-digit security code from your email.' }, 400);
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      return jsonResponse({ error: 'New password must be between 6 and 128 characters.' }, 400);
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return jsonResponse({ error: 'Passwords do not match.' }, 400);
    }

    const resetRow = await env.DB.prepare(
      'SELECT * FROM password_resets WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    )
      .bind(email)
      .first<{
        id: string;
        user_id: string;
        email: string;
        code_hash: string;
        attempts: number;
        used: number;
        expires_at: string;
      }>();

    if (!resetRow) {
      return jsonResponse({ error: 'Invalid or expired security code.' }, 400);
    }

    const expiryMs = Date.parse(resetRow.expires_at);
    if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
      await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(resetRow.id).run();
      return jsonResponse({ error: 'Security code has expired. Please request a new one.' }, 400);
    }

    if (resetRow.attempts >= 5) {
      await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(resetRow.id).run();
      return jsonResponse({ error: 'Too many incorrect attempts. Please request a new security code.' }, 429);
    }

    const expectedHash = await sha256Hex(`${resetRow.id}:${code}`);
    if (!safeEqual(expectedHash, resetRow.code_hash)) {
      const nextAttempts = resetRow.attempts + 1;
      await env.DB.prepare('UPDATE password_resets SET attempts = ?, used = ? WHERE id = ?')
        .bind(nextAttempts, nextAttempts >= 5 ? 1 : 0, resetRow.id)
        .run();
      return jsonResponse({ error: 'Invalid or expired security code.' }, 400);
    }

    const user = await env.DB.prepare('SELECT id, is_blocked FROM users WHERE id = ?')
      .bind(resetRow.user_id)
      .first<{ id: string; is_blocked: number }>();
    if (!user || user.is_blocked === 1) {
      return jsonResponse({ error: 'Invalid or expired security code.' }, 400);
    }

    // Atomically consume the one-time code before updating password
    const consumeRes = await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE id = ? AND used = 0')
      .bind(resetRow.id)
      .run();
    if ((consumeRes.meta?.changes ?? 0) === 0) {
      return jsonResponse({ error: 'This security code has already been used.' }, 400);
    }
    await env.DB.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').bind(user.id).run();

    const newHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();

    return jsonResponse({
      ok: true,
      message: 'Your password has been reset. You can now log in with your new password.',
    });
  }

  // Current authenticated user + links + plan expiry notices
  if (method === 'GET' && path === '/api/me') {
    let user: UserRow | null = null;
    try {
      user = await getAuthUser(req, env);
    } catch {
      return jsonResponse({ error: 'Server authentication is not configured.' }, 500);
    }
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const linksRes = await env.DB.prepare(
      'SELECT * FROM links WHERE user_id = ? ORDER BY position ASC, created_at ASC'
    )
      .bind(user.id)
      .all<LinkRow>();

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    const activeLinksCount = linksRes.results.filter((l) => Number(l.is_active) === 1).length;
    const prodAgg = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM products WHERE user_id = ? AND is_active = 1'
    )
      .bind(user.id)
      .first<{ total: number }>();
    const activeProductsCount = Number(prodAgg?.total ?? 0);
    const hadExpiredPro = Boolean(!activePro && user.pro_expires_at);
    const hiddenLinksCount = !activePro ? Math.max(0, activeLinksCount - 5) : 0;
    const hiddenProductsCount = !activePro ? Math.max(0, activeProductsCount - 3) : 0;
    const revertedTheme = Boolean(!activePro && isPremiumTheme(user.theme));

    return jsonResponse({
      user: sanitizeUser(user),
      links: linksRes.results.map((l) => ({
        ...l,
        is_active: Boolean(l.is_active),
      })),
      planNotice: {
        hadExpiredPro,
        hiddenLinksCount,
        hiddenProductsCount,
        revertedTheme,
      },
    });
  }

  // Update creator profile
  if (method === 'PUT' && path === '/api/profile') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await parseJsonBody<{
      name?: string;
      bio?: string;
      avatar_url?: string;
      youtube_url?: string;
      spotify_url?: string;
      whatsapp_number?: string;
      theme?: string;
      bank_code?: string;
      account_number?: string;
      account_name?: string;
    }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const name = (body.name ?? user.name).trim();
    if (name.length < 2) return jsonResponse({ error: 'Display name must be at least 2 characters.' }, 400);

    const bio = (body.bio ?? user.bio).trim().slice(0, 300);
    const avatarUrl = (body.avatar_url ?? user.avatar_url).trim();
    if (avatarUrl && !isValidHttpUrl(avatarUrl)) {
      return jsonResponse(
        { error: 'Profile picture must be a valid image URL (e.g. from imgbb.com or Instagram).' },
        400
      );
    }

    const youtubeUrl = (body.youtube_url ?? user.youtube_url).trim();
    const spotifyUrl = (body.spotify_url ?? user.spotify_url).trim();
    const whatsappNumber = (body.whatsapp_number ?? user.whatsapp_number).trim();

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    let targetTheme: ThemeId;
    if (body.theme !== undefined) {
      const requested = String(body.theme).trim();
      const mapped = normalizeThemeKey(requested);
      const isRecognized =
        requested in THEMES ||
        ['light', 'dark', 'naija_green', 'purple_hustle', 'sunset'].includes(requested);
      if (!isRecognized) return jsonResponse({ error: 'Invalid theme selected.' }, 400);
      if (THEMES[mapped].proOnly && !activePro) {
        return jsonResponse(
          {
            error:
              'This premium theme makes you sell 3 times more — Upgrade to Pro ₦1,000 for 30 days to unlock all 5 beautiful themes.',
          },
          403
        );
      }
      targetTheme = mapped;
    } else {
      targetTheme = resolveThemeId(user.theme, activePro);
    }

    const bankCode = (body.bank_code ?? user.bank_code).trim();
    const bankMatch = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    const bankName = bankMatch ? bankMatch.name : bankCode ? user.bank_name : '';
    const accountNumber = (body.account_number ?? user.account_number).trim();
    const accountName = (body.account_name ?? user.account_name).trim();

    if (accountNumber && !/^\d{10}$/.test(accountNumber)) {
      return jsonResponse({ error: 'Nigerian bank account number must be 10 digits.' }, 400);
    }

    await env.DB.prepare(
      `UPDATE users SET
        name = ?, bio = ?, avatar_url = ?, youtube_url = ?, spotify_url = ?,
        whatsapp_number = ?, theme = ?, bank_code = ?, bank_name = ?,
        account_number = ?, account_name = ?
       WHERE id = ?`
    )
      .bind(
        name,
        bio,
        avatarUrl,
        youtubeUrl,
        spotifyUrl,
        whatsappNumber,
        targetTheme,
        bankCode,
        bankName,
        accountNumber,
        accountName,
        user.id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
    return jsonResponse({ user: updated ? sanitizeUser(updated) : null });
  }

  // Creator Store Products CRUD (Text / Link only — zero file upload)
  if (method === 'GET' && path === '/api/products') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    const rowsRes = await env.DB.prepare(
      'SELECT * FROM products WHERE user_id = ? ORDER BY created_at ASC'
    )
      .bind(user.id)
      .all<ProductRow>();

    const products = rowsRes.results.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      username: p.username,
      title: p.title,
      description: p.description,
      price_kobo: Number(p.price_kobo),
      product_type: p.product_type as ProductType,
      cover_url: p.cover_url,
      preview_url: p.preview_url || '',
      external_url: p.external_url,
      is_active: Boolean(p.is_active),
      sales_count: Number(p.sales_count || 0),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const activeCount = products.filter((p) => p.is_active).length;

    return jsonResponse({
      products,
      activeCount,
      freeLimit: 3,
      isPro: activePro,
    });
  }

  if (method === 'POST' && path === '/api/products') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await parseJsonBody<{
      title?: string;
      description?: string;
      price_ngn?: number | string;
      product_type?: string;
      cover_url?: string;
      preview_url?: string;
      external_url?: string;
    }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const title = (body.title || '').trim().slice(0, 60);
    const description = (body.description || '').trim().slice(0, 300);
    const priceNgn = Number(body.price_ngn);
    const productType = (body.product_type || '').trim() as ProductType;
    const coverUrl = (body.cover_url || '').trim();
    const rawPreviewUrl = (body.preview_url || '').trim();
    const externalUrl = normalizeLinkUrl(body.external_url || '');

    if (title.length < 2) {
      return jsonResponse({ error: 'Product title must be between 2 and 60 characters.' }, 400);
    }
    if (!Number.isFinite(priceNgn) || priceNgn < 200 || priceNgn > 50000) {
      return jsonResponse({ error: 'Product price must be between ₦200 and ₦50,000.' }, 400);
    }
    if (!(productType in PRODUCT_TYPES)) {
      return jsonResponse({ error: 'Please select a valid product type.' }, 400);
    }
    if (coverUrl && (!isValidHttpUrl(coverUrl) || coverUrl.startsWith('demo:'))) {
      return jsonResponse({ error: 'Cover image must be a valid http/https image URL.' }, 400);
    }
    let previewUrl = '';
    if (rawPreviewUrl) {
      const parsedPreview = parsePreviewEmbed(rawPreviewUrl);
      if (!parsedPreview) {
        return jsonResponse(
          { error: 'Preview Link must be a valid YouTube, Audiomack, Spotify, or Boomplay link (or leave blank).' },
          400
        );
      }
      previewUrl =
        rawPreviewUrl.startsWith('http://') || rawPreviewUrl.startsWith('https://')
          ? rawPreviewUrl
          : `https://${rawPreviewUrl}`;
    }
    if (!externalUrl || (!externalUrl.startsWith('http://') && !externalUrl.startsWith('https://'))) {
      return jsonResponse({ error: 'Please paste a valid http/https delivery link for your product.' }, 400);
    }

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    const activeCountRow = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM products WHERE user_id = ? AND is_active = 1'
    )
      .bind(user.id)
      .first<{ total: number }>();

    if (!activePro && Number(activeCountRow?.total ?? 0) >= 3) {
      return jsonResponse(
        {
          error: 'Free plan limited to 3 active products — Upgrade to Pro ₦1,000/month for unlimited products.',
          code: 'FREE_PRODUCT_LIMIT_REACHED',
        },
        403
      );
    }

    const id = generateId();
    const priceKobo = Math.round(priceNgn * 100);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO products (
        id, user_id, username, title, description, price_kobo, product_type, cover_url, preview_url, external_url,
        is_active, sales_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
    )
      .bind(id, user.id, user.username, title, description, priceKobo, productType, coverUrl, previewUrl, externalUrl, now, now)
      .run();

    const created = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
    return jsonResponse(
      {
        product: created
          ? {
              ...created,
              preview_url: created.preview_url || '',
              price_kobo: Number(created.price_kobo),
              is_active: Boolean(created.is_active),
              sales_count: Number(created.sales_count || 0),
            }
          : null,
      },
      201
    );
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const productId = productMatch[1];
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?')
      .bind(productId, user.id)
      .first<ProductRow>();
    if (!existing) return jsonResponse({ error: 'Product not found' }, 404);

    if (method === 'PUT') {
      const body = await parseJsonBody<{
        title?: string;
        description?: string;
        price_ngn?: number | string;
        product_type?: string;
        cover_url?: string;
        preview_url?: string;
        external_url?: string;
        is_active?: boolean;
      }>(req);
      if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

      const title = (body.title ?? existing.title).trim().slice(0, 60);
      const description = (body.description ?? existing.description).trim().slice(0, 300);
      const priceKobo =
        body.price_ngn !== undefined
          ? (() => {
              const p = Number(body.price_ngn);
              if (!Number.isFinite(p) || p < 200 || p > 50000) return -1;
              return Math.round(p * 100);
            })()
          : Number(existing.price_kobo);

      if (title.length < 2) {
        return jsonResponse({ error: 'Product title must be between 2 and 60 characters.' }, 400);
      }
      if (priceKobo < 20000) {
        return jsonResponse({ error: 'Product price must be between ₦200 and ₦50,000.' }, 400);
      }

      const productType = ((body.product_type ?? existing.product_type) as string).trim() as ProductType;
      if (!(productType in PRODUCT_TYPES)) {
        return jsonResponse({ error: 'Please select a valid product type.' }, 400);
      }

      const coverUrl = (body.cover_url ?? existing.cover_url).trim();
      if (coverUrl && (!isValidHttpUrl(coverUrl) || coverUrl.startsWith('demo:'))) {
        return jsonResponse({ error: 'Cover image must be a valid http/https image URL.' }, 400);
      }

      let previewUrl = existing.preview_url || '';
      if (body.preview_url !== undefined) {
        const rawPreviewUrl = body.preview_url.trim();
        if (!rawPreviewUrl) {
          previewUrl = '';
        } else {
          const parsedPreview = parsePreviewEmbed(rawPreviewUrl);
          if (!parsedPreview) {
            return jsonResponse(
              { error: 'Preview Link must be a valid YouTube, Audiomack, Spotify, or Boomplay link (or leave blank).' },
              400
            );
          }
          previewUrl =
            rawPreviewUrl.startsWith('http://') || rawPreviewUrl.startsWith('https://')
              ? rawPreviewUrl
              : `https://${rawPreviewUrl}`;
        }
      }

      const externalUrl =
        body.external_url !== undefined ? normalizeLinkUrl(body.external_url) : existing.external_url;
      if (!externalUrl || (!externalUrl.startsWith('http://') && !externalUrl.startsWith('https://'))) {
        return jsonResponse({ error: 'Please paste a valid http/https delivery link for your product.' }, 400);
      }

      const nextActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;
      const activePro = isProActive(user.is_pro, user.pro_expires_at);
      if (nextActive === 1 && existing.is_active === 0 && !activePro) {
        const activeCountRow = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM products WHERE user_id = ? AND is_active = 1'
        )
          .bind(user.id)
          .first<{ total: number }>();
        if (Number(activeCountRow?.total ?? 0) >= 3) {
          return jsonResponse(
            {
              error: 'Free plan limited to 3 active products — Upgrade to Pro ₦1,000/month for unlimited products.',
              code: 'FREE_PRODUCT_LIMIT_REACHED',
            },
            403
          );
        }
      }

      const now = new Date().toISOString();
      await env.DB.prepare(
        `UPDATE products SET
          title = ?, description = ?, price_kobo = ?, product_type = ?,
          cover_url = ?, preview_url = ?, external_url = ?, is_active = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
        .bind(title, description, priceKobo, productType, coverUrl, previewUrl, externalUrl, nextActive, now, productId, user.id)
        .run();

      const updated = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first<ProductRow>();
      return jsonResponse({
        product: updated
          ? {
              ...updated,
              preview_url: updated.preview_url || '',
              price_kobo: Number(updated.price_kobo),
              is_active: Boolean(updated.is_active),
              sales_count: Number(updated.sales_count || 0),
            }
          : null,
      });
    }

    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').bind(productId, user.id).run();
      return jsonResponse({ deleted: true });
    }
  }

  // Create link (enforces 5-link cap for Free users on backend!)
  if (method === 'POST' && path === '/api/links') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await parseJsonBody<{ title?: string; url?: string }>(req);
    if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

    const title = (body.title || '').trim();
    const normalizedUrl = normalizeLinkUrl(body.url || '');
    if (!title || !normalizedUrl) {
      return jsonResponse({ error: 'Both link title and URL are required.' }, 400);
    }

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    const countRow = await env.DB.prepare('SELECT COUNT(*) as total FROM links WHERE user_id = ?')
      .bind(user.id)
      .first<{ total: number }>();

    if (!activePro && (countRow?.total ?? 0) >= 5) {
      return jsonResponse(
        {
          error: 'Free plan limited to 5 links — Upgrade to Pro ₦1,000/month for unlimited links.',
          code: 'FREE_LIMIT_REACHED',
        },
        403
      );
    }

    const maxPosRow = await env.DB.prepare('SELECT COALESCE(MAX(position), -1) as maxPos FROM links WHERE user_id = ?')
      .bind(user.id)
      .first<{ maxPos: number }>();

    const id = generateId();
    const platform = detectPlatform(normalizedUrl);
    const position = (maxPosRow?.maxPos ?? -1) + 1;
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO links (id, user_id, title, url, platform, is_active, position, clicks, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?)`
    )
      .bind(id, user.id, title, normalizedUrl, platform, position, now)
      .run();

    const created = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<LinkRow>();
    return jsonResponse({
      link: created ? { ...created, is_active: Boolean(created.is_active) } : null,
    }, 201);
  }

  // Reorder links
  if (method === 'PUT' && path === '/api/links/reorder') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await parseJsonBody<{ orderedIds?: string[] }>(req);
    if (!body || !Array.isArray(body.orderedIds)) {
      return jsonResponse({ error: 'orderedIds array is required.' }, 400);
    }

    for (let i = 0; i < body.orderedIds.length; i++) {
      await env.DB.prepare('UPDATE links SET position = ? WHERE id = ? AND user_id = ?')
        .bind(i, body.orderedIds[i], user.id)
        .run();
    }

    const linksRes = await env.DB.prepare('SELECT * FROM links WHERE user_id = ? ORDER BY position ASC')
      .bind(user.id)
      .all<LinkRow>();

    return jsonResponse({
      links: linksRes.results.map((l) => ({ ...l, is_active: Boolean(l.is_active) })),
    });
  }

  // Update or Delete link by id
  const linkMatch = path.match(/^\/api\/links\/([^/]+)$/);
  if (linkMatch) {
    const linkId = linkMatch[1];
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const existing = await env.DB.prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
      .bind(linkId, user.id)
      .first<LinkRow>();
    if (!existing) return jsonResponse({ error: 'Link not found' }, 404);

    if (method === 'PUT') {
      const body = await parseJsonBody<{ title?: string; url?: string; is_active?: boolean }>(req);
      if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

      const title = (body.title ?? existing.title).trim();
      const nextUrl = body.url !== undefined ? normalizeLinkUrl(body.url) : existing.url;
      if (!title || !nextUrl) return jsonResponse({ error: 'Title and URL cannot be empty.' }, 400);

      const platform = detectPlatform(nextUrl);
      const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;

      await env.DB.prepare('UPDATE links SET title = ?, url = ?, platform = ?, is_active = ? WHERE id = ? AND user_id = ?')
        .bind(title, nextUrl, platform, isActive, linkId, user.id)
        .run();

      const updated = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(linkId).first<LinkRow>();
      return jsonResponse({ link: updated ? { ...updated, is_active: Boolean(updated.is_active) } : null });
    }

    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM links WHERE id = ? AND user_id = ?').bind(linkId, user.id).run();
      return jsonResponse({ deleted: true });
    }
  }

  // Creator Analytics
  if (method === 'GET' && path === '/api/analytics') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const linksRes = await env.DB.prepare(
      'SELECT id, title, platform, clicks, is_active FROM links WHERE user_id = ? ORDER BY clicks DESC'
    )
      .bind(user.id)
      .all<{ id: string; title: string; platform: string; clicks: number; is_active: number }>();

    const totalClicks = linksRes.results.reduce((sum, l) => sum + (Number(l.clicks) || 0), 0);

    const tipsAgg = await env.DB.prepare(
      'SELECT COALESCE(SUM(amount_kobo), 0) as gross_kobo, COUNT(*) as tip_count FROM tips WHERE to_user_id = ?'
    )
      .bind(user.id)
      .first<{ gross_kobo: number; tip_count: number }>();

    // Last 7 days views
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }

    const viewRows = await env.DB.prepare(
      'SELECT view_date, COUNT(*) as views FROM page_views WHERE user_id = ? AND view_date >= ? GROUP BY view_date'
    )
      .bind(user.id, days[0])
      .all<{ view_date: string; views: number }>();

    const viewMap = new Map(viewRows.results.map((r) => [r.view_date, Number(r.views)]));
    const viewsLast7Days = days.map((date) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-NG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      views: viewMap.get(date) ?? 0,
    }));

    const recentClicksRes = await env.DB.prepare(
      'SELECT id, link_title, platform, clicked_at FROM link_clicks WHERE user_id = ? ORDER BY clicked_at DESC LIMIT 20'
    )
      .bind(user.id)
      .all<{ id: string; link_title: string; platform: string; clicked_at: string }>();

    return jsonResponse({
      summary: {
        totalViews: user.total_views,
        totalClicks,
        totalTipsGrossKobo: Number(tipsAgg?.gross_kobo ?? 0),
        totalTipsCount: Number(tipsAgg?.tip_count ?? 0),
        pendingBalanceKobo: user.pending_balance_kobo,
        totalEarningsKobo: user.total_earnings_kobo,
      },
      clicksPerLink: linksRes.results.map((l) => ({
        id: l.id,
        title: l.title,
        platform: l.platform,
        clicks: Number(l.clicks) || 0,
      })),
      viewsLast7Days,
      recentClicks: recentClicksRes.results,
    });
  }

  // Creator Unified Earnings (Tips + Digital Store Sales)
  if (method === 'GET' && (path === '/api/tips' || path === '/api/earnings')) {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const tipsRes = await env.DB.prepare(
      `SELECT id, from_name, message, amount_kobo, commission_kobo, net_kobo, paystack_reference, created_at
       FROM tips WHERE to_user_id = ? ORDER BY created_at DESC LIMIT 100`
    )
      .bind(user.id)
      .all<{
        id: string;
        from_name: string;
        message: string;
        amount_kobo: number;
        commission_kobo: number;
        net_kobo: number;
        paystack_reference: string;
        created_at: string;
      }>();

    const salesRes = await env.DB.prepare(
      `SELECT id, product_id, product_title, product_type, buyer_email, amount_kobo, commission_kobo, net_kobo, paystack_reference, created_at
       FROM product_sales WHERE seller_id = ? ORDER BY created_at DESC LIMIT 100`
    )
      .bind(user.id)
      .all<{
        id: string;
        product_id: string;
        product_title: string;
        product_type: string;
        buyer_email: string;
        amount_kobo: number;
        commission_kobo: number;
        net_kobo: number;
        paystack_reference: string;
        created_at: string;
      }>();

    const tipAgg = await env.DB.prepare(
      'SELECT COALESCE(SUM(net_kobo), 0) as total_net FROM tips WHERE to_user_id = ?'
    )
      .bind(user.id)
      .first<{ total_net: number }>();

    const storeAgg = await env.DB.prepare(
      'SELECT COALESCE(SUM(net_kobo), 0) as total_net FROM product_sales WHERE seller_id = ?'
    )
      .bind(user.id)
      .first<{ total_net: number }>();

    const payoutsRes = await env.DB.prepare(
      'SELECT id, bank_name, account_number, account_name, amount_kobo, paid_at FROM payouts WHERE user_id = ? ORDER BY paid_at DESC LIMIT 30'
    )
      .bind(user.id)
      .all();

    return jsonResponse({
      pendingBalanceKobo: user.pending_balance_kobo,
      totalEarningsKobo: user.total_earnings_kobo,
      tipEarningsKobo: Number(tipAgg?.total_net ?? 0),
      storeEarningsKobo: Number(storeAgg?.total_net ?? 0),
      payoutRequestedAt: user.payout_requested_at,
      tips: tipsRes.results,
      productSales: salesRes.results.map((s) => ({
        id: s.id,
        product_id: s.product_id,
        product_title: s.product_title,
        product_type: s.product_type,
        buyer_email_masked: maskEmail(s.buyer_email),
        amount_kobo: Number(s.amount_kobo),
        commission_kobo: Number(s.commission_kobo),
        net_kobo: Number(s.net_kobo),
        paystack_reference: s.paystack_reference,
        created_at: s.created_at,
      })),
      payouts: payoutsRes.results,
    });
  }

  // Request Payout
  if (method === 'POST' && path === '/api/payouts/request') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    if (user.pending_balance_kobo <= 0) {
      return jsonResponse({ error: 'You have no pending balance available for payout yet.' }, 400);
    }
    if (!user.bank_code || !user.account_number || !user.account_name) {
      return jsonResponse(
        { error: 'Please save your Nigerian bank details in Edit Profile before requesting payout.' },
        400
      );
    }

    const requestedAt = new Date().toISOString();
    await env.DB.prepare('UPDATE users SET payout_requested_at = ? WHERE id = ?').bind(requestedAt, user.id).run();
    return jsonResponse({ payoutRequestedAt: requestedAt });
  }

  // Public Bio Page (/api/public/profile/:username)
  const publicMatch = path.match(/^\/api\/public\/profile\/([^/]+)$/);
  if (method === 'GET' && publicMatch) {
    const username = decodeURIComponent(publicMatch[1]).trim().toLowerCase();
    const isPreview = url.searchParams.get('preview') === '1';

    const rawUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>();
    if (!rawUser) return jsonResponse({ error: 'Creator page not found' }, 404);
    if (rawUser.is_blocked === 1) return jsonResponse({ error: 'This creator page is unavailable' }, 403);

    const user = await syncUserProStatus(env.DB, rawUser);
    const activePro = isProActive(user.is_pro, user.pro_expires_at);

    let totalViews = user.total_views;
    if (!isPreview) {
      totalViews += 1;
      const nowIso = new Date().toISOString();
      const viewDate = nowIso.slice(0, 10);
      await env.DB.prepare('UPDATE users SET total_views = total_views + 1 WHERE id = ?').bind(user.id).run();
      await env.DB.prepare(
        'INSERT INTO page_views (id, user_id, viewed_at, view_date, referrer) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(generateId(), user.id, nowIso, viewDate, req.headers.get('Referer') || '')
        .run();
    }

    const linksRes = await env.DB.prepare(
      'SELECT id, title, url, platform, position, clicks FROM links WHERE user_id = ? AND is_active = 1 ORDER BY position ASC, created_at ASC'
    )
      .bind(user.id)
      .all<{ id: string; title: string; url: string; platform: string; position: number; clicks: number }>();

    // CRITICAL: NEVER select external_url on public profile endpoint!
    // Enforce Free limits: max 5 links, max 3 oldest active products, 2 ugly free themes, max 1 music embed, watermark visible
    const productsRes = await env.DB.prepare(
      'SELECT id, title, description, price_kobo, product_type, cover_url, preview_url, sales_count, created_at FROM products WHERE user_id = ? AND is_active = 1 ORDER BY created_at ASC'
    )
      .bind(user.id)
      .all<{
        id: string;
        title: string;
        description: string;
        price_kobo: number;
        product_type: string;
        cover_url: string;
        preview_url: string;
        sales_count: number;
        created_at: string;
      }>();

    const visibleLinks = activePro ? linksRes.results : linksRes.results.slice(0, 5);
    const visibleProducts = activePro ? productsRes.results : productsRes.results.slice(0, 3);
    const effectiveTheme = resolveThemeId(user.theme, activePro);

    const youtubeUrl = user.youtube_url || '';
    const spotifyUrl = activePro ? user.spotify_url || '' : youtubeUrl ? '' : user.spotify_url || '';

    return jsonResponse({
      profile: {
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        youtube_url: youtubeUrl,
        spotify_url: spotifyUrl,
        whatsapp_number: user.whatsapp_number,
        theme: effectiveTheme,
        total_views: totalViews,
        is_pro: activePro,
        pro_expires_at: activePro ? user.pro_expires_at : null,
        verified_tick: activePro,
        show_watermark: !activePro,
      },
      links: visibleLinks,
      products: visibleProducts.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price_kobo: Number(p.price_kobo),
        product_type: p.product_type,
        cover_url: p.cover_url,
        preview_url: p.preview_url || '',
        sales_count: Number(p.sales_count || 0),
      })),
    });
  }

  // Public Link Click tracking
  if (method === 'POST' && path === '/api/public/click') {
    const body = await parseJsonBody<{ linkId?: string; username?: string }>(req);
    if (!body?.linkId) return jsonResponse({ error: 'linkId required' }, 400);

    const link = await env.DB.prepare('SELECT * FROM links WHERE id = ?').bind(body.linkId).first<LinkRow>();
    if (!link) return jsonResponse({ ok: false }, 404);

    await env.DB.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?').bind(link.id).run();
    await env.DB.prepare(
      'INSERT INTO link_clicks (id, user_id, link_id, link_title, platform, clicked_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(generateId(), link.user_id, link.id, link.title, link.platform, new Date().toISOString())
      .run();

    return jsonResponse({ ok: true });
  }

  // Verify Paystack Tip (Server-Side Anti-Scam Verification)
  if (method === 'POST' && path === '/api/payments/verify-tip') {
    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    const publicKey = (env.PAYSTACK_PUBLIC_KEY || '').trim();
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured on the server.' }, 500);
    }
    const pkMode = getPaystackKeyMode(publicKey);
    const skMode = getPaystackKeyMode(secretKey);
    if (pkMode && skMode && pkMode !== skMode) {
      return jsonResponse(
        {
          error: `Paystack key mismatch: Public Key is ${pkMode.toUpperCase()} while Secret Key is ${skMode.toUpperCase()}. Update both keys in Cloudflare Environment Variables.`,
        },
        500
      );
    }

    const body = await parseJsonBody<{
      reference?: string;
      username?: string;
      fromName?: string;
      fromEmail?: string;
      message?: string;
    }>(req);
    if (!body?.reference || !body?.username) {
      return jsonResponse({ error: 'Payment reference and creator username are required.' }, 400);
    }

    const reference = body.reference.trim();
    const username = body.username.trim().toLowerCase();
    const fromName = (body.fromName || 'Anonymous Supporter').trim().slice(0, 80) || 'Anonymous Supporter';
    const fromEmail = (body.fromEmail || '').trim().slice(0, 120);
    const message = (body.message || '').trim().slice(0, 240);

    const creator = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>();
    if (!creator || creator.is_blocked === 1) {
      return jsonResponse({ error: 'Creator account not found.' }, 404);
    }

    const existingTip = await env.DB.prepare(
      'SELECT to_user_id, amount_kobo, commission_kobo, net_kobo FROM tips WHERE paystack_reference = ?'
    )
      .bind(reference)
      .first<{ to_user_id: string; amount_kobo: number; commission_kobo: number; net_kobo: number }>();

    if (existingTip) {
      if (existingTip.to_user_id === creator.id) {
        return jsonResponse({
          verified: true,
          amountKobo: Number(existingTip.amount_kobo),
          commissionKobo: Number(existingTip.commission_kobo),
          netKobo: Number(existingTip.net_kobo),
          reference,
          alreadyRecorded: true,
        });
      }
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const dupPro = await env.DB.prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?')
      .bind(reference)
      .first();
    if (dupPro) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }
    const dupSale = await env.DB.prepare('SELECT id FROM product_sales WHERE paystack_reference = ?')
      .bind(reference)
      .first();
    if (dupSale) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const verification = await verifyPaystackTransaction(reference, secretKey);
    if (!verification.ok || !verification.amountKobo || verification.amountKobo < 10000) {
      return jsonResponse(
        { error: verification.error || 'Could not verify payment with Paystack (minimum ₦100).' },
        400
      );
    }

    const result = await recordVerifiedTip(env.DB, {
      creator,
      reference,
      amountKobo: verification.amountKobo,
      fromName,
      fromEmail,
      message,
    });

    if (result.status === 'conflict') {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    return jsonResponse({
      verified: true,
      amountKobo: result.amountKobo,
      commissionKobo: result.commissionKobo,
      netKobo: result.netKobo,
      reference,
      alreadyRecorded: result.status === 'already_credited',
    });
  }

  // Verify Paystack Pro Subscription (₦1,000 / 30 days)
  if (method === 'POST' && path === '/api/payments/verify-pro') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    const publicKey = (env.PAYSTACK_PUBLIC_KEY || '').trim();
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured on the server.' }, 500);
    }
    const pkMode = getPaystackKeyMode(publicKey);
    const skMode = getPaystackKeyMode(secretKey);
    if (pkMode && skMode && pkMode !== skMode) {
      return jsonResponse(
        {
          error: `Paystack key mismatch: Public Key is ${pkMode.toUpperCase()} while Secret Key is ${skMode.toUpperCase()}. Update both keys in Cloudflare Environment Variables.`,
        },
        500
      );
    }

    const body = await parseJsonBody<{ reference?: string }>(req);
    const reference = (body?.reference || '').trim();
    if (!reference) return jsonResponse({ error: 'Payment reference is required.' }, 400);

    const existingPro = await env.DB.prepare('SELECT user_id, expires_at FROM pro_payments WHERE paystack_reference = ?')
      .bind(reference)
      .first<{ user_id: string; expires_at: string }>();
    if (existingPro) {
      if (existingPro.user_id === user.id) {
        return jsonResponse({
          verified: true,
          user: sanitizeUser(user),
          pro_expires_at: existingPro.expires_at,
          alreadyRecorded: true,
        });
      }
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const dupTip = await env.DB.prepare('SELECT id FROM tips WHERE paystack_reference = ?').bind(reference).first();
    if (dupTip) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }
    const dupSale = await env.DB.prepare('SELECT id FROM product_sales WHERE paystack_reference = ?')
      .bind(reference)
      .first();
    if (dupSale) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const expectedKobo = proPriceNgn * 100;
    const verification = await verifyPaystackTransaction(reference, secretKey);
    if (!verification.ok || !verification.amountKobo || verification.amountKobo < expectedKobo) {
      return jsonResponse(
        { error: verification.error || `Payment amount must be at least ₦${proPriceNgn} for Pro.` },
        400
      );
    }

    const result = await recordVerifiedPro(env.DB, {
      user,
      reference,
      amountKobo: verification.amountKobo,
    });
    if (result.status === 'conflict') {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    return jsonResponse({
      verified: true,
      user: result.user ? sanitizeUser(result.user) : null,
      pro_expires_at: result.expiresAt,
      alreadyRecorded: result.status === 'already_credited',
    });
  }

  // Verify Paystack Digital Store Purchase (Reveals external_url / embed ONLY after confirmed payment)
  if (method === 'POST' && path === '/api/payments/verify-product') {
    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    const publicKey = (env.PAYSTACK_PUBLIC_KEY || '').trim();
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured on the server.' }, 500);
    }
    const pkMode = getPaystackKeyMode(publicKey);
    const skMode = getPaystackKeyMode(secretKey);
    if (pkMode && skMode && pkMode !== skMode) {
      return jsonResponse(
        {
          error: `Paystack key mismatch: Public Key is ${pkMode.toUpperCase()} while Secret Key is ${skMode.toUpperCase()}. Update both keys in Cloudflare Environment Variables.`,
        },
        500
      );
    }

    const body = await parseJsonBody<{
      reference?: string;
      productId?: string;
      buyerEmail?: string;
    }>(req);
    const reference = (body?.reference || '').trim();
    const productId = (body?.productId || '').trim();
    const buyerEmail = (body?.buyerEmail || '').trim().slice(0, 120);

    if (!reference || !productId) {
      return jsonResponse({ error: 'Payment reference and productId are required.' }, 400);
    }

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first<ProductRow>();
    if (!product) {
      return jsonResponse({ error: 'Product not found.' }, 404);
    }
    const seller = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(product.user_id).first<UserRow>();
    if (!seller || seller.is_blocked === 1) {
      return jsonResponse({ error: 'Seller account is unavailable.' }, 404);
    }

    const existingSale = await env.DB.prepare(
      'SELECT product_id, amount_kobo, commission_kobo, net_kobo FROM product_sales WHERE paystack_reference = ?'
    )
      .bind(reference)
      .first<{ product_id: string; amount_kobo: number; commission_kobo: number; net_kobo: number }>();

    if (existingSale) {
      if (existingSale.product_id === product.id) {
        const embed = parseProductEmbed(product.product_type as ProductType, product.external_url);
        return jsonResponse({
          verified: true,
          reference,
          amountKobo: Number(existingSale.amount_kobo),
          commissionKobo: Number(existingSale.commission_kobo),
          netKobo: Number(existingSale.net_kobo),
          alreadyRecorded: true,
          delivery: {
            productId: product.id,
            title: product.title,
            productType: product.product_type,
            externalUrl: product.external_url,
            embed,
          },
        });
      }
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const dupTip = await env.DB.prepare('SELECT id FROM tips WHERE paystack_reference = ?').bind(reference).first();
    const dupPro = await env.DB.prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?').bind(reference).first();
    if (dupTip || dupPro) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const verification = await verifyPaystackTransaction(reference, secretKey);
    if (!verification.ok || !verification.amountKobo || verification.amountKobo < Number(product.price_kobo)) {
      return jsonResponse(
        { error: verification.error || 'Could not verify full product payment with Paystack.' },
        400
      );
    }

    const result = await recordVerifiedProductSale(env.DB, {
      product,
      seller,
      reference,
      amountKobo: verification.amountKobo,
      buyerEmail,
    });

    if (result.status === 'conflict') {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const embed = parseProductEmbed(product.product_type as ProductType, product.external_url);
    return jsonResponse({
      verified: true,
      reference,
      amountKobo: result.amountKobo,
      commissionKobo: result.commissionKobo,
      netKobo: result.netKobo,
      alreadyRecorded: result.status === 'already_credited',
      delivery: {
        productId: product.id,
        title: product.title,
        productType: product.product_type,
        externalUrl: product.external_url,
        embed,
      },
    });
  }

  // Paystack Webhook (Server-to-Server backup & bank-transfer / mobile fallback)
  if (method === 'POST' && path === '/api/payments/webhook') {
    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured.' }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const validSig = await verifyPaystackWebhookSignature(rawBody, signature, secretKey);
    if (!validSig) {
      return jsonResponse({ error: 'Invalid Paystack webhook signature.' }, 401);
    }

    let eventPayload: {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        customer?: { email?: string };
        metadata?: unknown;
      };
    } | null = null;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Invalid JSON webhook body' }, 400);
    }

    if (eventPayload?.event !== 'charge.success' || eventPayload.data?.status !== 'success') {
      return jsonResponse({ received: true, ignored: true });
    }

    const tx = eventPayload.data;
    const reference = (tx.reference || '').trim();
    const amountKobo = Number(tx.amount || 0);
    if (!reference || amountKobo <= 0 || (tx.currency && tx.currency !== 'NGN')) {
      return jsonResponse({ received: true, ignored: true });
    }

    let meta: Record<string, unknown> = {};
    if (typeof tx.metadata === 'string') {
      try {
        meta = JSON.parse(tx.metadata) as Record<string, unknown>;
      } catch {
        meta = {};
      }
    } else if (tx.metadata && typeof tx.metadata === 'object') {
      meta = tx.metadata as Record<string, unknown>;
    }

    const metaType = String(meta.type || '').trim();

    if (metaType === 'product_sale' || reference.toLowerCase().startsWith('prod_')) {
      const productId = String(meta.product_id || '').trim();
      if (productId) {
        const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?')
          .bind(productId)
          .first<ProductRow>();
        if (product && amountKobo >= Number(product.price_kobo)) {
          const seller = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
            .bind(product.user_id)
            .first<UserRow>();
          if (seller && seller.is_blocked !== 1) {
            const buyerEmail = String(meta.buyer_email || tx.customer?.email || '').trim().slice(0, 120);
            await recordVerifiedProductSale(env.DB, {
              product,
              seller,
              reference,
              amountKobo,
              buyerEmail,
            });
          }
        }
      }
    } else if (metaType === 'tip' && amountKobo >= 10000) {
      const toUsername = String(meta.to_username || '').trim().toLowerCase();
      if (toUsername) {
        const creator = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
          .bind(toUsername)
          .first<UserRow>();
        if (creator && creator.is_blocked !== 1) {
          const fromName = String(meta.from_name || 'Anonymous Supporter').trim().slice(0, 80) || 'Anonymous Supporter';
          const fromEmail = String(meta.from_email || tx.customer?.email || '').trim().slice(0, 120);
          const message = String(meta.message || '').trim().slice(0, 240);
          await recordVerifiedTip(env.DB, {
            creator,
            reference,
            amountKobo,
            fromName,
            fromEmail,
            message,
          });
        }
      }
    } else if (metaType === 'pro_subscription' && amountKobo >= proPriceNgn * 100) {
      const userId = String(meta.user_id || '').trim();
      const username = String(meta.username || '').trim().toLowerCase();
      let targetUser: UserRow | null = null;
      if (userId) {
        targetUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>();
      } else if (username) {
        targetUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>();
      }
      if (targetUser && targetUser.is_blocked !== 1) {
        await recordVerifiedPro(env.DB, {
          user: targetUser,
          reference,
          amountKobo,
        });
      }
    }

    return jsonResponse({ received: true });
  }

  // Admin Login
  if (method === 'POST' && path === '/api/admin/login') {
    const adminEmail = (env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = env.ADMIN_PASSWORD || '';
    if (!adminEmail || !adminPassword) {
      return jsonResponse(
        { error: 'Admin credentials (ADMIN_EMAIL / ADMIN_PASSWORD) are not set in environment variables.' },
        500
      );
    }

    const body = await parseJsonBody<{ email?: string; password?: string }>(req);
    if (!body?.email || !body?.password) {
      return jsonResponse({ error: 'Email and password are required.' }, 400);
    }

    const inputEmail = body.email.trim().toLowerCase();
    if (!safeEqual(inputEmail, adminEmail) || !safeEqual(body.password, adminPassword)) {
      return jsonResponse({ error: 'Invalid admin credentials.' }, 401);
    }

    let secret: string;
    try {
      secret = getJwtSecret(env);
    } catch {
      return jsonResponse({ error: 'Server JWT_SECRET is not configured in environment variables.' }, 500);
    }

    const token = await signJwt({ sub: 'admin', role: 'admin', email: adminEmail }, secret, 60 * 60 * 12);
    return jsonResponse({ token, email: adminEmail });
  }

  // Admin Protected Routes
  if (path.startsWith('/api/admin/')) {
    let isAdmin = false;
    try {
      isAdmin = await requireAdmin(req, env);
    } catch {
      return jsonResponse({ error: 'Server authentication not configured.' }, 500);
    }
    if (!isAdmin) return jsonResponse({ error: 'Admin authorization required.' }, 401);

    if (method === 'GET' && path === '/api/admin/overview') {
      // Sync all expired pros before reporting stats
      await env.DB.prepare(
        "UPDATE users SET is_pro = 0 WHERE is_pro = 1 AND (pro_expires_at IS NULL OR pro_expires_at <= ?)"
      )
        .bind(new Date().toISOString())
        .run();

      const usersRes = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all<UserRow>();
      const users = usersRes.results.map(sanitizeUser);

      const tipsRes = await env.DB.prepare('SELECT * FROM tips ORDER BY created_at DESC LIMIT 500').all<{
        id: string;
        to_user_id: string;
        to_username: string;
        from_name: string;
        from_email: string;
        message: string;
        amount_kobo: number;
        commission_kobo: number;
        net_kobo: number;
        paystack_reference: string;
        status: string;
        created_at: string;
      }>();

      const proRes = await env.DB.prepare('SELECT * FROM pro_payments ORDER BY created_at DESC LIMIT 500').all<{
        id: string;
        user_id: string;
        username: string;
        amount_kobo: number;
        paystack_reference: string;
        expires_at: string;
        created_at: string;
      }>();

      const payoutsRes = await env.DB.prepare('SELECT * FROM payouts ORDER BY paid_at DESC LIMIT 200').all();

      const prodAgg = await env.DB.prepare(
        'SELECT COUNT(*) as total_products, COALESCE(SUM(is_active), 0) as active_products FROM products'
      ).first<{ total_products: number; active_products: number }>();

      const salesAgg = await env.DB.prepare(
        'SELECT COUNT(*) as total_sales, COALESCE(SUM(amount_kobo), 0) as total_revenue, COALESCE(SUM(commission_kobo), 0) as total_commission FROM product_sales'
      ).first<{ total_sales: number; total_revenue: number; total_commission: number }>();

      // CRITICAL PRIVACY: Admin sales table uses masked buyer email and NEVER queries/returns external_url!
      const recentSalesRes = await env.DB.prepare(
        `SELECT id, product_id, product_title, product_type, seller_username, buyer_email,
                amount_kobo, commission_kobo, net_kobo, paystack_reference, created_at
         FROM product_sales ORDER BY created_at DESC LIMIT 200`
      ).all<{
        id: string;
        product_id: string;
        product_title: string;
        product_type: string;
        seller_username: string;
        buyer_email: string;
        amount_kobo: number;
        commission_kobo: number;
        net_kobo: number;
        paystack_reference: string;
        created_at: string;
      }>();

      const totalUsers = users.length;
      const proUsers = users.filter((u) => u.is_pro).length;
      const freeUsers = totalUsers - proUsers;
      const totalTipsVolumeKobo = tipsRes.results.reduce((s, t) => s + Number(t.amount_kobo || 0), 0);
      const totalCommissionKobo = tipsRes.results.reduce((s, t) => s + Number(t.commission_kobo || 0), 0);
      const totalPendingPayoutKobo = users.reduce((s, u) => s + Number(u.pending_balance_kobo || 0), 0);
      const totalProRevenueKobo = proRes.results.reduce((s, p) => s + Number(p.amount_kobo || 0), 0);

      let freeThemeUsers = 0;
      let premiumThemeUsers = 0;
      const themeCounts: Record<string, number> = {};
      for (const u of users) {
        themeCounts[u.theme] = (themeCounts[u.theme] || 0) + 1;
        if (isPremiumTheme(u.theme)) premiumThemeUsers += 1;
        else freeThemeUsers += 1;
      }

      const payoutQueue = users.filter((u) => u.pending_balance_kobo > 0);

      return jsonResponse({
        stats: {
          totalUsers,
          freeUsers,
          proUsers,
          totalTipsVolumeKobo,
          totalCommissionKobo,
          totalPendingPayoutKobo,
          totalProRevenueKobo,
          totalProPaymentsCount: proRes.results.length,
        },
        storeStats: {
          totalProducts: Number(prodAgg?.total_products ?? 0),
          activeProducts: Number(prodAgg?.active_products ?? 0),
          totalSales: Number(salesAgg?.total_sales ?? 0),
          totalStoreRevenueKobo: Number(salesAgg?.total_revenue ?? 0),
          totalStoreCommissionKobo: Number(salesAgg?.total_commission ?? 0),
          freeThemeUsers,
          premiumThemeUsers,
          themeCounts,
        },
        recentProductSales: recentSalesRes.results.map((s) => ({
          id: s.id,
          product_id: s.product_id,
          product_title: s.product_title,
          product_type: s.product_type,
          seller_username: s.seller_username,
          buyer_email_masked: maskEmail(s.buyer_email),
          amount_kobo: Number(s.amount_kobo),
          commission_kobo: Number(s.commission_kobo),
          net_kobo: Number(s.net_kobo),
          paystack_reference: s.paystack_reference,
          created_at: s.created_at,
        })),
        users,
        tips: tipsRes.results,
        proPayments: proRes.results,
        payoutQueue,
        payoutHistory: payoutsRes.results,
      });
    }

    const blockMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/toggle-block$/);
    if (method === 'POST' && blockMatch) {
      const userId = blockMatch[1];
      const user = await env.DB.prepare('SELECT id, is_blocked FROM users WHERE id = ?')
        .bind(userId)
        .first<{ id: string; is_blocked: number }>();
      if (!user) return jsonResponse({ error: 'User not found' }, 404);
      const nextBlocked = user.is_blocked === 1 ? 0 : 1;
      await env.DB.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').bind(nextBlocked, userId).run();
      return jsonResponse({ is_blocked: Boolean(nextBlocked) });
    }

    const delUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (method === 'DELETE' && delUserMatch) {
      const userId = delUserMatch[1];
      await env.DB.prepare('DELETE FROM links WHERE user_id = ?').bind(userId).run();
      await env.DB.prepare('DELETE FROM products WHERE user_id = ?').bind(userId).run();
      await env.DB.prepare('DELETE FROM page_views WHERE user_id = ?').bind(userId).run();
      await env.DB.prepare('DELETE FROM link_clicks WHERE user_id = ?').bind(userId).run();
      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      return jsonResponse({ deleted: true });
    }

    if (method === 'POST' && path === '/api/admin/payouts/mark-paid') {
      const body = await parseJsonBody<{ userIds?: string[] }>(req);
      if (!body?.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
        return jsonResponse({ error: 'Select at least one creator payout to mark as paid.' }, 400);
      }

      const paidAt = new Date().toISOString();
      let processedCount = 0;

      for (const uid of body.userIds) {
        const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first<UserRow>();
        if (!u || u.pending_balance_kobo <= 0) continue;

        await env.DB.prepare(
          `INSERT INTO payouts (id, user_id, username, bank_code, bank_name, account_number, account_name, amount_kobo, paid_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            generateId(),
            u.id,
            u.username,
            u.bank_code || '-',
            u.bank_name || 'Bank not set',
            u.account_number || '-',
            u.account_name || u.name,
            u.pending_balance_kobo,
            paidAt
          )
          .run();

        await env.DB.prepare('UPDATE users SET pending_balance_kobo = 0, payout_requested_at = NULL WHERE id = ?')
          .bind(u.id)
          .run();

        processedCount += 1;
      }

      return jsonResponse({ processedCount, paidAt });
    }

    if (method === 'GET' && path === '/api/admin/ad-settings') {
      const enabledRow = await env.DB.prepare("SELECT value, updated_at FROM app_settings WHERE key = 'ads_enabled'")
        .first<{ value: string; updated_at: string }>();
      const codeRow = await env.DB.prepare("SELECT value, updated_at FROM app_settings WHERE key = 'ad_code'")
        .first<{ value: string; updated_at: string }>();

      return jsonResponse({
        adsEnabled: enabledRow?.value === '1' || enabledRow?.value === 'true',
        adCode: codeRow?.value || '',
        updatedAt: codeRow?.updated_at || enabledRow?.updated_at || null,
      });
    }

    if (method === 'PUT' && path === '/api/admin/ad-settings') {
      const body = await parseJsonBody<{ adsEnabled?: boolean; adCode?: string }>(req);
      if (!body) return jsonResponse({ error: 'Invalid JSON payload' }, 400);

      const adsEnabled = Boolean(body.adsEnabled);
      const adCode = typeof body.adCode === 'string' ? body.adCode.trim() : '';
      if (adCode.length > 25000) {
        return jsonResponse({ error: 'Ad code snippet is too large (max 25,000 characters).' }, 400);
      }

      const nowIso = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('ads_enabled', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
        .bind(adsEnabled ? '1' : '0', nowIso)
        .run();

      await env.DB.prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('ad_code', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
        .bind(adCode, nowIso)
        .run();

      return jsonResponse({
        adsEnabled,
        adCode,
        updatedAt: nowIso,
      });
    }
  }

  return jsonResponse({ error: `Route not found: ${method} ${path}` }, 404);
}
