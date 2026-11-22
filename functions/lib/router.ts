import {
  detectPlatform,
  isProActive,
  NIGERIAN_BANKS,
  normalizeLinkUrl,
  THEMES,
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
    theme: row.theme,
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
      'Content-Type': 'application/json',
    },
  });
  const payload = (await res.json()) as {
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
    const hasSecret = Boolean((env.PAYSTACK_SECRET_KEY || '').trim());
    return jsonResponse({
      paystackPublicKey: publicKey,
      paystackConfigured: Boolean(publicKey && hasSecret),
      proPriceNgn,
      proPriceKobo: proPriceNgn * 100,
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

  // Current authenticated user + links
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

    return jsonResponse({
      user: sanitizeUser(user),
      links: linksRes.results.map((l) => ({
        ...l,
        is_active: Boolean(l.is_active),
      })),
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
      theme?: ThemeId;
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

    const requestedTheme = (body.theme ?? user.theme) as ThemeId;
    const themeMeta = THEMES[requestedTheme];
    if (!themeMeta) return jsonResponse({ error: 'Invalid theme selected.' }, 400);

    const activePro = isProActive(user.is_pro, user.pro_expires_at);
    if (themeMeta.proOnly && !activePro) {
      return jsonResponse({ error: `${themeMeta.name} theme requires an active Pro subscription.` }, 403);
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
        requestedTheme,
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

  // Creator Tips & Earnings
  if (method === 'GET' && path === '/api/tips') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const tipsRes = await env.DB.prepare(
      `SELECT id, from_name, message, amount_kobo, commission_kobo, net_kobo, paystack_reference, created_at
       FROM tips WHERE to_user_id = ? ORDER BY created_at DESC LIMIT 100`
    )
      .bind(user.id)
      .all();

    const payoutsRes = await env.DB.prepare(
      'SELECT id, bank_name, account_number, account_name, amount_kobo, paid_at FROM payouts WHERE user_id = ? ORDER BY paid_at DESC LIMIT 30'
    )
      .bind(user.id)
      .all();

    return jsonResponse({
      pendingBalanceKobo: user.pending_balance_kobo,
      totalEarningsKobo: user.total_earnings_kobo,
      payoutRequestedAt: user.payout_requested_at,
      tips: tipsRes.results,
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

    // Enforce Free limits on public page: max 5 links, only light/dark themes, max 1 music embed, watermark visible
    const visibleLinks = activePro ? linksRes.results : linksRes.results.slice(0, 5);
    const savedTheme = (user.theme as ThemeId) || 'light';
    const effectiveTheme: ThemeId =
      activePro || !THEMES[savedTheme]?.proOnly ? (THEMES[savedTheme] ? savedTheme : 'light') : 'light';

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
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured on the server.' }, 500);
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

    // Prevent double-spending / replay attacks
    const dupTip = await env.DB.prepare('SELECT id FROM tips WHERE paystack_reference = ?').bind(reference).first();
    const dupPro = await env.DB.prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?')
      .bind(reference)
      .first();
    if (dupTip || dupPro) {
      return jsonResponse({ error: 'This payment reference has already been processed.' }, 409);
    }

    const verification = await verifyPaystackTransaction(reference, secretKey);
    if (!verification.ok || !verification.amountKobo || verification.amountKobo < 10000) {
      return jsonResponse(
        { error: verification.error || 'Could not verify payment with Paystack (minimum ₦100).' },
        400
      );
    }

    const amountKobo = verification.amountKobo;
    const commissionKobo = Math.round(amountKobo * 0.1);
    const netKobo = amountKobo - commissionKobo;
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO tips (
        id, to_user_id, to_username, from_name, from_email, message,
        amount_kobo, commission_kobo, net_kobo, paystack_reference, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', ?)`
    )
      .bind(
        generateId(),
        creator.id,
        creator.username,
        fromName,
        fromEmail,
        message,
        amountKobo,
        commissionKobo,
        netKobo,
        reference,
        now
      )
      .run();

    await env.DB.prepare(
      `UPDATE users SET
        pending_balance_kobo = pending_balance_kobo + ?,
        total_earnings_kobo = total_earnings_kobo + ?
       WHERE id = ?`
    )
      .bind(netKobo, netKobo, creator.id)
      .run();

    return jsonResponse({
      verified: true,
      amountKobo,
      commissionKobo,
      netKobo,
      reference,
    });
  }

  // Verify Paystack Pro Subscription (₦1,000 / 30 days)
  if (method === 'POST' && path === '/api/payments/verify-pro') {
    const user = await getAuthUser(req, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const secretKey = (env.PAYSTACK_SECRET_KEY || '').trim();
    if (!secretKey) {
      return jsonResponse({ error: 'Paystack secret key is not configured on the server.' }, 500);
    }

    const body = await parseJsonBody<{ reference?: string }>(req);
    const reference = (body?.reference || '').trim();
    if (!reference) return jsonResponse({ error: 'Payment reference is required.' }, 400);

    const dupPro = await env.DB.prepare('SELECT id FROM pro_payments WHERE paystack_reference = ?')
      .bind(reference)
      .first();
    const dupTip = await env.DB.prepare('SELECT id FROM tips WHERE paystack_reference = ?').bind(reference).first();
    if (dupPro || dupTip) {
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

    const nowMs = Date.now();
    const existingExpiryMs = user.pro_expires_at ? new Date(user.pro_expires_at).getTime() : 0;
    const baseMs = isProActive(user.is_pro, user.pro_expires_at) && existingExpiryMs > nowMs ? existingExpiryMs : nowMs;
    const newExpiry = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date(nowMs).toISOString();

    await env.DB.prepare(
      `INSERT INTO pro_payments (id, user_id, username, amount_kobo, paystack_reference, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(generateId(), user.id, user.username, verification.amountKobo, reference, newExpiry, nowIso)
      .run();

    await env.DB.prepare('UPDATE users SET is_pro = 1, pro_expires_at = ? WHERE id = ?')
      .bind(newExpiry, user.id)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
    return jsonResponse({
      verified: true,
      user: updated ? sanitizeUser(updated) : null,
      pro_expires_at: newExpiry,
    });
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

      const totalUsers = users.length;
      const proUsers = users.filter((u) => u.is_pro).length;
      const freeUsers = totalUsers - proUsers;
      const totalTipsVolumeKobo = tipsRes.results.reduce((s, t) => s + Number(t.amount_kobo || 0), 0);
      const totalCommissionKobo = tipsRes.results.reduce((s, t) => s + Number(t.commission_kobo || 0), 0);
      const totalPendingPayoutKobo = users.reduce((s, u) => s + Number(u.pending_balance_kobo || 0), 0);
      const totalProRevenueKobo = proRes.results.reduce((s, p) => s + Number(p.amount_kobo || 0), 0);

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
  }

  return jsonResponse({ error: `Route not found: ${method} ${path}` }, 404);
}
