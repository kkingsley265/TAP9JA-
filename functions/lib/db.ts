import { generateId, hashPassword } from './crypto.ts';

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch?(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
  exec?(query: string): Promise<unknown>;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    youtube_url TEXT NOT NULL DEFAULT '',
    spotify_url TEXT NOT NULL DEFAULT '',
    whatsapp_number TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'light',
    bank_code TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    account_name TEXT NOT NULL DEFAULT '',
    is_pro INTEGER NOT NULL DEFAULT 0,
    pro_expires_at TEXT DEFAULT NULL,
    pending_balance_kobo INTEGER NOT NULL DEFAULT 0,
    total_earnings_kobo INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    payout_requested_at TEXT DEFAULT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    platform TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_links_user_pos ON links (user_id, position)`,
  `CREATE TABLE IF NOT EXISTS page_views (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    viewed_at TEXT NOT NULL,
    view_date TEXT NOT NULL,
    referrer TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_views_user_date ON page_views (user_id, view_date)`,
  `CREATE TABLE IF NOT EXISTS link_clicks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    link_id TEXT NOT NULL,
    link_title TEXT NOT NULL,
    platform TEXT NOT NULL,
    clicked_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_clicks_user_time ON link_clicks (user_id, clicked_at)`,
  `CREATE TABLE IF NOT EXISTS tips (
    id TEXT PRIMARY KEY,
    to_user_id TEXT NOT NULL,
    to_username TEXT NOT NULL,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    amount_kobo INTEGER NOT NULL,
    commission_kobo INTEGER NOT NULL,
    net_kobo INTEGER NOT NULL,
    paystack_reference TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tips_to_user ON tips (to_user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS pro_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount_kobo INTEGER NOT NULL,
    paystack_reference TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    amount_kobo INTEGER NOT NULL,
    paid_at TEXT NOT NULL
  )`,
];

let schemaInitialized = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(db: D1DatabaseLike): Promise<void> {
  if (schemaInitialized) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.prepare(stmt).run();
    }
    await seedShowcaseCreatorsIfEmpty(db);
    schemaInitialized = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
}

async function seedShowcaseCreatorsIfEmpty(db: D1DatabaseLike): Promise<void> {
  const countRow = await db.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>();
  if ((countRow?.total ?? 0) > 0) return;

  const now = new Date();
  const proExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const demoPassHash = await hashPassword('Tap9jaDemoPass!2026');

  const demoCreators = [
    {
      id: generateId(),
      username: 'khalidbeats',
      email: 'khalid@tap9ja.demo',
      name: 'Khalid Vibes',
      bio: 'Afrobeats producer & songwriter out of Lekki, Lagos. New EP "Midnight in Victoria Island" streaming everywhere.',
      avatar_url: 'demo:hero',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      spotify_url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
      whatsapp_number: '+2348091234567',
      theme: 'purple_hustle',
      is_pro: 1,
      pro_expires_at: proExpiry,
      total_views: 1842,
      links: [
        { title: 'Stream "Midnight in VI" on Spotify', url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', platform: 'spotify', clicks: 412 },
        { title: 'Listen on Boomplay Africa', url: 'https://www.boomplay.com/', platform: 'boomplay', clicks: 289 },
        { title: 'My Audiomack Mixtape', url: 'https://audiomack.com/', platform: 'audiomack', clicks: 196 },
        { title: 'Follow on Instagram @khalidvibes', url: 'https://instagram.com/', platform: 'instagram', clicks: 340 },
        { title: 'Book Studio Session (WhatsApp)', url: 'https://wa.me/2348091234567', platform: 'whatsapp', clicks: 158 },
        { title: 'Watch Music Video on YouTube', url: 'https://youtube.com/', platform: 'youtube', clicks: 271 },
        { title: 'Official Merch & Beat Store', url: 'https://selar.co/', platform: 'shop', clicks: 114 },
      ],
    },
    {
      id: generateId(),
      username: 'amakaatelier',
      email: 'amaka@tap9ja.demo',
      name: 'Amaka Atelier',
      bio: 'Bespoke contemporary Ankara & ready-to-wear studio in Yaba, Lagos. Worldwide DHL delivery.',
      avatar_url: 'demo:fashion',
      youtube_url: '',
      spotify_url: '',
      whatsapp_number: '+2348035550192',
      theme: 'naija_green',
      is_pro: 1,
      pro_expires_at: proExpiry,
      total_views: 964,
      links: [
        { title: 'Shop New Harmattan Collection', url: 'https://selar.co/', platform: 'shop', clicks: 264 },
        { title: 'Order via WhatsApp Concierge', url: 'https://wa.me/2348035550192', platform: 'whatsapp', clicks: 319 },
        { title: 'Lookbook on Instagram', url: 'https://instagram.com/', platform: 'instagram', clicks: 198 },
        { title: 'Behind the Seams on TikTok', url: 'https://tiktok.com/', platform: 'tiktok', clicks: 142 },
      ],
    },
    {
      id: generateId(),
      username: 'tundebuilds',
      email: 'tunde@tap9ja.demo',
      name: 'Tunde Tech Show',
      bio: 'Breaking down African tech startups, remote jobs, and creator monetization every Tuesday.',
      avatar_url: 'demo:tech',
      youtube_url: '',
      spotify_url: 'https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk',
      whatsapp_number: '',
      theme: 'dark',
      is_pro: 0,
      pro_expires_at: null,
      total_views: 520,
      links: [
        { title: 'Watch Full Episodes on YouTube', url: 'https://youtube.com/', platform: 'youtube', clicks: 184 },
        { title: 'Join Telegram Tech Community', url: 'https://t.me/', platform: 'telegram', clicks: 132 },
        { title: 'Follow on X (@tundebuilds)', url: 'https://x.com/', platform: 'twitter', clicks: 97 },
        { title: 'Book 1-on-1 Career Review', url: 'https://calendly.com/', platform: 'booking', clicks: 61 },
      ],
    },
  ];

  for (const creator of demoCreators) {
    await db
      .prepare(
        `INSERT INTO users (
          id, username, email, password_hash, name, bio, avatar_url, youtube_url, spotify_url,
          whatsapp_number, theme, is_pro, pro_expires_at, total_views, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        creator.id,
        creator.username,
        creator.email,
        demoPassHash,
        creator.name,
        creator.bio,
        creator.avatar_url,
        creator.youtube_url,
        creator.spotify_url,
        creator.whatsapp_number,
        creator.theme,
        creator.is_pro,
        creator.pro_expires_at,
        creator.total_views,
        now.toISOString()
      )
      .run();

    for (let i = 0; i < creator.links.length; i++) {
      const l = creator.links[i];
      await db
        .prepare(
          `INSERT INTO links (id, user_id, title, url, platform, is_active, position, clicks, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
        )
        .bind(generateId(), creator.id, l.title, l.url, l.platform, i, l.clicks, now.toISOString())
        .run();
    }

    // Seed last 7 days of views for demo analytics
    for (let d = 6; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dayStr = day.toISOString().slice(0, 10);
      const count = 4 + ((6 - d) * 2);
      for (let v = 0; v < count; v++) {
        await db
          .prepare(`INSERT INTO page_views (id, user_id, viewed_at, view_date, referrer) VALUES (?, ?, ?, ?, ?)`)
          .bind(generateId(), creator.id, day.toISOString(), dayStr, 'instagram')
          .run();
      }
    }
  }
}
