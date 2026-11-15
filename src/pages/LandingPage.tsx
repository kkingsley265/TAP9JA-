import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ExternalLink,
  HeartHandshake,
  Music2,
  QrCode,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BrandMark } from '../components/BrandMark';
import { PlatformBadgeIcon, VerifiedBlueTick } from '../components/PlatformIcon';
import type { PlatformId } from '../shared/platforms';

const DEMO_PROFILES = [
  {
    username: 'khalidbeats',
    name: 'Khalid Vibes',
    role: 'Afrobeats Producer · Lagos',
    avatar: 'demo:hero',
    isPro: true,
    themeClass: 'from-[#190933] via-[#2e1065] to-[#064e3b] text-white',
    bio: 'New EP "Midnight in Victoria Island" streaming everywhere.',
    links: [
      { title: 'Stream EP on Spotify', platform: 'spotify' as PlatformId },
      { title: 'Listen on Boomplay Africa', platform: 'boomplay' as PlatformId },
      { title: 'Follow @khalidvibes on Instagram', platform: 'instagram' as PlatformId },
      { title: 'Book Studio via WhatsApp', platform: 'whatsapp' as PlatformId },
    ],
  },
  {
    username: 'amakaatelier',
    name: 'Amaka Atelier',
    role: 'Fashion Studio · Yaba',
    avatar: 'demo:fashion',
    isPro: true,
    themeClass: 'from-emerald-950 via-green-900 to-teal-950 text-white',
    bio: 'Contemporary Ankara & ready-to-wear. Worldwide DHL shipping.',
    links: [
      { title: 'Shop Harmattan Collection', platform: 'shop' as PlatformId },
      { title: 'Order on WhatsApp Concierge', platform: 'whatsapp' as PlatformId },
      { title: 'Lookbook on Instagram', platform: 'instagram' as PlatformId },
      { title: 'Behind the Seams on TikTok', platform: 'tiktok' as PlatformId },
    ],
  },
  {
    username: 'tundebuilds',
    name: 'Tunde Tech Show',
    role: 'Tech Creator · Abuja',
    avatar: 'demo:tech',
    isPro: false,
    themeClass: 'from-zinc-950 via-slate-900 to-zinc-900 text-white',
    bio: 'African startups, remote careers & creator monetization.',
    links: [
      { title: 'Watch Episodes on YouTube', platform: 'youtube' as PlatformId },
      { title: 'Join Telegram Community', platform: 'telegram' as PlatformId },
      { title: 'Follow on X (@tundebuilds)', platform: 'twitter' as PlatformId },
      { title: 'Book 1-on-1 Review', platform: 'booking' as PlatformId },
    ],
  },
];

const FAQS = [
  {
    q: 'How do fans tip me and how do I withdraw to my Nigerian bank?',
    a: 'Fans tap "Support Me" on your tap9ja.com/u/username page and pay securely in Naira via Paystack (card, bank transfer, or USSD). We verify every transaction directly with Paystack, credit 90% to your pending balance (10% platform fee), and process payouts every Friday to your Access, GTB, UBA, First Bank, Kuda, or OPay account.',
  },
  {
    q: 'Why is TAP9JA Pro ₦1,000 per month instead of a one-time fee?',
    a: 'Monthly Pro keeps your verified blue tick, unlimited links, dual YouTube + Spotify music embeds, all 5 themes, full analytics charts, and watermark removal active every 30 days. If your Pro month expires, your page never goes offline — it simply reverts to the Free plan (first 5 links visible) until you renew.',
  },
  {
    q: 'Do I need to upload my profile photo or MP3 music files?',
    a: 'No heavy file uploads needed. Paste your Instagram or imgbb.com image link for your avatar, and paste your YouTube or Spotify link to embed a playable music player directly inside your bio page.',
  },
  {
    q: 'Can I change my username link later?',
    a: 'Your tap9ja.com/u/username URL is permanently yours once claimed so your Instagram, TikTok, and printed QR codes never break.',
  },
];

const SUPPORTED_PLATFORMS: Array<{ id: PlatformId; name: string }> = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'spotify', name: 'Spotify' },
  { id: 'boomplay', name: 'Boomplay' },
  { id: 'audiomack', name: 'Audiomack' },
  { id: 'apple_music', name: 'Apple Music' },
  { id: 'shop', name: 'Jumia / Selar / Shopify' },
  { id: 'twitter', name: 'X (Twitter)' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'booking', name: 'Calendly Booking' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [claimName, setClaimName] = useState('');
  const [activeDemoIdx, setActiveDemoIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeDemo = DEMO_PROFILES[activeDemoIdx];

  const handleClaim = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = claimName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    navigate(cleaned ? `/register?username=${encodeURIComponent(cleaned)}` : '/register');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones (Brand wordmark, 4-5 concise links, 1 primary CTA) */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="whitespace-nowrap shrink-0">
            <BrandMark />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#creators" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Creators
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
            <Link to="/login" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Log in
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 shadow-sm"
            >
              Create My Free Link
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Split */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            background:
              'radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.18), transparent 42%), radial-gradient(circle at 85% 20%, rgba(124, 58, 237, 0.16), transparent 45%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-sm font-semibold text-emerald-700">
              Built for African creators, artists & online vendors
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-extrabold tracking-tight text-slate-950 leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              One Link For All Your Hustle
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Put <span className="font-semibold text-slate-900">tap9ja.com/u/username</span> in your Instagram or
              TikTok bio. Showcase your music, WhatsApp, Jumia or Selar store, and receive Naira tips via Paystack in
              one page.
            </p>

            {/* Claim Username Form */}
            <form
              onSubmit={handleClaim}
              className="max-w-xl p-2 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-900/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="flex items-center flex-1 px-3.5 h-12">
                <span className="text-sm font-semibold text-slate-400 select-none shrink-0">tap9ja.com/u/</span>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  maxLength={20}
                  aria-label="Claim your TAP9JA username"
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none ml-0.5"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                Create My Free Link
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
              <span>Free forever starter plan</span>
              <span aria-hidden="true">·</span>
              <span>Paystack Naira tips</span>
              <span aria-hidden="true">·</span>
              <span>No file upload needed</span>
            </div>
          </div>

          {/* Interactive Phone Mockup */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[340px] rounded-[2.75rem] p-3 bg-slate-950 shadow-2xl shadow-purple-950/20 border border-slate-800">
              <div className={`rounded-[2.2rem] p-5 bg-gradient-to-br ${activeDemo.themeClass} min-h-[540px] flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between text-[11px] opacity-75 mb-4">
                    <span className="font-mono-nums">tap9ja.com/u/{activeDemo.username}</span>
                    <Link
                      to={`/u/${activeDemo.username}`}
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      Live Page <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="flex flex-col items-center text-center mb-5">
                    <Avatar src={activeDemo.avatar} name={activeDemo.name} sizeClass="h-20 w-20" />
                    <div className="mt-3 flex items-center gap-1.5">
                      <h2 className="text-lg font-display font-bold">{activeDemo.name}</h2>
                      {activeDemo.isPro && <VerifiedBlueTick className="h-4 w-4" />}
                    </div>
                    <p className="text-xs opacity-75 mt-0.5">{activeDemo.role}</p>
                    <p className="text-xs opacity-90 mt-2 leading-relaxed line-clamp-2">{activeDemo.bio}</p>
                  </div>

                  <div className="space-y-2.5">
                    {activeDemo.links.map((item) => (
                      <Link
                        key={item.title}
                        to={`/u/${activeDemo.username}`}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-colors"
                      >
                        <PlatformBadgeIcon platform={item.platform} />
                        <span className="text-xs font-semibold truncate flex-1">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/u/${activeDemo.username}`}
                  className="mt-5 h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg"
                >
                  <HeartHandshake className="h-4 w-4" />
                  Support Me (Tip Jar)
                </Link>
              </div>
            </div>

            {/* Switch Demo Creator */}
            <div className="mt-4 flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
              {DEMO_PROFILES.map((demo, idx) => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => setActiveDemoIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                    idx === activeDemoIdx
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  @{demo.username}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms & Bento Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-950">
            Everything your audience expects, without slow uploads
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Paste your link and TAP9JA detects the platform icon automatically — built for fast loading on Nigerian
            mobile networks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wide Feature 1 */}
          <div className="md:col-span-2 rounded-3xl bg-white border border-slate-200 p-7 flex flex-col justify-between gap-6">
            <div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">18+ Auto-Detected Creator Platforms</h3>
              <p className="text-sm text-slate-600 mt-2 max-w-xl">
                Drop any link from Instagram, TikTok, WhatsApp, Boomplay, Audiomack, Spotify, YouTube, Jumia, Shopify,
                Selar, or Calendly. Icons and colors wire up automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SUPPORTED_PLATFORMS.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70"
                >
                  <PlatformBadgeIcon platform={p.id} />
                  <span className="text-xs font-semibold text-slate-800 truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 2 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-7 flex flex-col justify-between">
            <div>
              <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">Paystack Naira Tip Jar</h3>
              <p className="text-sm text-slate-600 mt-2">
                Fans support you with ₦500, ₦1,000, ₦2,000, or custom amounts. Every payment is server-verified with
                Paystack before crediting 90% to your pending balance.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Friday Nigerian bank payouts</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </div>

          {/* Feature 3 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-7">
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <Music2 className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">YouTube & Spotify Embeds</h3>
            <p className="text-sm text-slate-600 mt-2">
              Fans play your newest single or podcast right inside your bio page without leaving. Zero MP3 uploads or
              storage limits.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-7">
            <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">Real-Time Click & View Analytics</h3>
            <p className="text-sm text-slate-600 mt-2">
              Track page views over the last 7 days, clicks per link, and recent supporter activity from your creator
              dashboard.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-7">
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">Instant Profile QR Code</h3>
            <p className="text-sm text-slate-600 mt-2">
              Download your high-resolution TAP9JA QR code for event flyers, product packaging, and offline pop-up booths.
            </p>
          </div>
        </div>
      </section>

      {/* Creator Showcase */}
      <section id="creators" className="bg-white border-y border-slate-200/80 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold tracking-tight text-slate-950">
                See live TAP9JA creator pages
              </h2>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                Click any profile below to inspect the live mobile bio experience, music embeds, and Paystack Tip Jar.
              </p>
            </div>
            <Link to="/register" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap">
              Claim your handle →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_PROFILES.map((c) => (
              <Link
                key={c.username}
                to={`/u/${c.username}`}
                className="group rounded-3xl border border-slate-200 bg-slate-50/70 hover:bg-white p-6 transition-all hover:shadow-lg"
              >
                <div className="flex items-center gap-4 mb-4">
                  <Avatar src={c.avatar} name={c.name} sizeClass="h-16 w-16" ringClass="ring-2 ring-white" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-slate-900 truncate">{c.name}</h3>
                      {c.isPro && <VerifiedBlueTick className="h-4 w-4" />}
                    </div>
                    <p className="text-xs text-slate-500">{c.role}</p>
                    <p className="text-xs font-mono-nums text-emerald-700 mt-0.5">/u/{c.username}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{c.bio}</p>
                <div className="mt-4 pt-4 border-t border-slate-200/70 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                  <span>Open live bio page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing FREE vs PRO ₦1,000 / month */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-950">
            Start free, go Pro for ₦1,000 a month
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Simple, transparent Nigerian pricing. Upgrade with Paystack for 30 days whenever you need unlimited links
            and custom themes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Free Tier */}
          <div className="rounded-3xl bg-white border border-slate-200 p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Starter Plan</p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-1">Free Forever</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-extrabold font-mono-nums text-slate-950">₦0</span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="text-sm text-slate-600 mt-3">
                Everything you need to launch your TAP9JA bio link in under a minute.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Up to 5 active links</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>1 YouTube or Spotify music embed</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Light & Dark bio themes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Paystack Tip Jar & QR Code</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <Check className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Includes TAP9JA footer watermark</span>
                </li>
              </ul>
            </div>

            <Link
              to="/register"
              className="mt-8 h-12 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Start Free Now
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-950 to-purple-950 text-white p-8 border border-emerald-500/30 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-emerald-300">For Active Creators & Brands</p>
                <span className="text-xs font-semibold text-purple-200">Most Popular</span>
              </div>
              <h3 className="text-2xl font-display font-bold mt-1">TAP9JA Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-extrabold font-mono-nums">₦1,000</span>
                <span className="text-sm text-slate-300">/ 30 days</span>
              </div>
              <p className="text-sm text-slate-300 mt-3">
                Unlock unlimited hustle links, verified blue tick, and remove the TAP9JA watermark.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-100">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited links & drag-and-drop sorting</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Dual YouTube & Spotify music embeds</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>All 5 themes (Naija Green, Purple Hustle, Sunset)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Verified Blue Tick beside your display name</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Hide TAP9JA watermark completely</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Full 7-day views & link clicks charts</span>
                </li>
              </ul>
            </div>

            <Link
              to="/register"
              className="mt-8 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white text-sm font-semibold flex items-center justify-center hover:opacity-95 transition-opacity"
            >
              Get Started & Go Pro
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-center text-slate-950 mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-display font-semibold text-sm sm:text-base text-slate-900 hover:bg-slate-50/70 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <BrandMark size="sm" />
            <span className="text-xs text-slate-500">One Link. All Your Hustle.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
            <Link to="/login" className="hover:text-slate-900">
              Creator Login
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Create Free Link
            </Link>
            <Link to="/u/khalidbeats" className="hover:text-slate-900">
              Live Demo
            </Link>
            <Link to="/admin" className="hover:text-slate-900">
              Admin
            </Link>
            <span>© {new Date().getFullYear()} TAP9JA.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
