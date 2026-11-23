import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  Crown,
  ExternalLink,
  GripVertical,
  HeartHandshake,
  Link2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  UserCog,
  Wallet,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClicksBarChart, ViewsLineChart } from '../components/AnalyticsCharts';
import { Avatar } from '../components/Avatar';
import { BrandMark } from '../components/BrandMark';
import { FreePlanAdModal } from '../components/FreePlanAdModal';
import { PlatformBadgeIcon, VerifiedBlueTick } from '../components/PlatformIcon';
import { QrModal } from '../components/QrModal';
import {
  apiFetch,
  getUserToken,
  openPaystackPopup,
  setUserToken,
  type CreatorLink,
  type PublicConfig,
  type UserProfile,
} from '../lib/api';
import {
  detectPlatform,
  formatNairaFromKobo,
  NIGERIAN_BANKS,
  THEMES,
  type ThemeId,
} from '../shared/platforms';

type TabId = 'links' | 'profile' | 'analytics' | 'tips' | 'pro';

interface AnalyticsPayload {
  summary: {
    totalViews: number;
    totalClicks: number;
    totalTipsGrossKobo: number;
    totalTipsCount: number;
    pendingBalanceKobo: number;
    totalEarningsKobo: number;
  };
  clicksPerLink: Array<{ id: string; title: string; platform: string; clicks: number }>;
  viewsLast7Days: Array<{ date: string; label: string; views: number }>;
  recentClicks: Array<{ id: string; link_title: string; platform: string; clicked_at: string }>;
}

interface TipsPayload {
  pendingBalanceKobo: number;
  totalEarningsKobo: number;
  payoutRequestedAt: string | null;
  tips: Array<{
    id: string;
    from_name: string;
    message: string;
    amount_kobo: number;
    commission_kobo: number;
    net_kobo: number;
    paystack_reference: string;
    created_at: string;
  }>;
  payouts: Array<{
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    amount_kobo: number;
    paid_at: string;
  }>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('links');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [links, setLinks] = useState<CreatorLink[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Links state
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Profile form state
  const [pName, setPName] = useState('');
  const [pBio, setPBio] = useState('');
  const [pAvatar, setPAvatar] = useState('');
  const [pYoutube, setPYoutube] = useState('');
  const [pSpotify, setPSpotify] = useState('');
  const [pWhatsapp, setPWhatsapp] = useState('');
  const [pTheme, setPTheme] = useState<ThemeId>('light');
  const [pBankCode, setPBankCode] = useState('');
  const [pAccountNumber, setPAccountNumber] = useState('');
  const [pAccountName, setPAccountName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Analytics & Tips state
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [tipsData, setTipsData] = useState<TipsPayload | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [upgradingPro, setUpgradingPro] = useState(false);

  // Free Plan Dashboard Ad state (never runs for active Pro users)
  const [adConfig, setAdConfig] = useState<{ adsEnabled: boolean; adCode: string } | null>(null);
  const [dashAdOpen, setDashAdOpen] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4200);
  };

  const syncFormFromUser = (u: UserProfile) => {
    setPName(u.name || '');
    setPBio(u.bio || '');
    setPAvatar(u.avatar_url || '');
    setPYoutube(u.youtube_url || '');
    setPSpotify(u.spotify_url || '');
    setPWhatsapp(u.whatsapp_number || '');
    setPTheme((u.theme as ThemeId) || 'light');
    setPBankCode(u.bank_code || '');
    setPAccountNumber(u.account_number || '');
    setPAccountName(u.account_name || '');
  };

  const loadAccount = useCallback(async () => {
    if (!getUserToken()) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const [meRes, cfgRes] = await Promise.all([
        apiFetch<{ user: UserProfile; links: CreatorLink[] }>('/api/me'),
        apiFetch<PublicConfig>('/api/config', { authMode: 'none' }),
      ]);
      setUser(meRes.user);
      setLinks(meRes.links);
      setConfig(cfgRes);
      syncFormFromUser(meRes.user);
    } catch {
      setUserToken(null);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'analytics') {
      apiFetch<AnalyticsPayload>('/api/analytics')
        .then(setAnalytics)
        .catch(() => {});
    } else if (activeTab === 'tips') {
      apiFetch<TipsPayload>('/api/tips')
        .then(setTipsData)
        .catch(() => {});
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!user || user.is_pro) {
      setAdConfig(null);
      setDashAdOpen(false);
      return;
    }
    let cancelled = false;
    apiFetch<{ adsEnabled: boolean; adCode: string }>('/api/ads/config', {
      authMode: 'none',
      cache: 'no-store',
    })
      .then((res) => {
        if (!cancelled) setAdConfig(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.is_pro]);

  useEffect(() => {
    if (!user || user.is_pro || !adConfig?.adsEnabled) return;

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const STORAGE_KEY = 'tap9ja_dash_ad_last';

    const checkAndShow = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
          return;
        }
        const lastShown = Number(raw);
        if (!Number.isFinite(lastShown) || Date.now() - lastShown >= FIVE_MINUTES_MS) {
          window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
          setDashAdOpen(true);
        }
      } catch {
        // fallback if storage unavailable
      }
    };

    checkAndShow();
    const interval = window.setInterval(checkAndShow, 15000);
    return () => window.clearInterval(interval);
  }, [user, adConfig]);

  const handleLogout = () => {
    setUserToken(null);
    navigate('/login');
  };

  const handleCopyProfile = async () => {
    if (!user) return;
    const url = `${window.location.origin}/u/${user.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  // Links Handlers
  const freeLinkLimitReached = Boolean(user && !user.is_pro && links.length >= 5);

  const handleAddLink = async (e: FormEvent) => {
    e.preventDefault();
    if (freeLinkLimitReached) {
      showToast('error', 'Free plan limited to 5 links — Upgrade to Pro ₦1,000/month for unlimited.');
      return;
    }
    setAddingLink(true);
    try {
      const res = await apiFetch<{ link: CreatorLink }>('/api/links', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), url: newUrl.trim() }),
      });
      setLinks((prev) => [...prev, res.link]);
      setNewTitle('');
      setNewUrl('');
      showToast('success', 'Link added to your TAP9JA page.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not add link.');
    } finally {
      setAddingLink(false);
    }
  };

  const handleToggleLink = async (link: CreatorLink) => {
    try {
      const res = await apiFetch<{ link: CreatorLink }>(`/api/links/${link.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !link.is_active }),
      });
      setLinks((prev) => prev.map((l) => (l.id === link.id ? res.link : l)));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update link.');
    }
  };

  const handleSaveLinkEdit = async (linkId: string) => {
    try {
      const res = await apiFetch<{ link: CreatorLink }>(`/api/links/${linkId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle.trim(), url: editUrl.trim() }),
      });
      setLinks((prev) => prev.map((l) => (l.id === linkId ? res.link : l)));
      setEditingLinkId(null);
      showToast('success', 'Link updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update link.');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await apiFetch(`/api/links/${linkId}`, { method: 'DELETE' });
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast('success', 'Link removed.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not delete link.');
    }
  };

  const persistReorder = async (nextLinks: CreatorLink[]) => {
    setLinks(nextLinks);
    try {
      await apiFetch('/api/links/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: nextLinks.map((l) => l.id) }),
      });
    } catch {
      showToast('error', 'Failed to save link order.');
    }
  };

  const moveLinkBy = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const copy = [...links];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    persistReorder(copy);
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = links.findIndex((l) => l.id === draggedId);
    const toIdx = links.findIndex((l) => l.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const copy = [...links];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setDraggedId(null);
    persistReorder(copy);
  };

  // Profile Save
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: pName,
          bio: pBio,
          avatar_url: pAvatar,
          youtube_url: pYoutube,
          spotify_url: pSpotify,
          whatsapp_number: pWhatsapp,
          theme: pTheme,
          bank_code: pBankCode,
          account_number: pAccountNumber,
          account_name: pAccountName,
        }),
      });
      setUser(res.user);
      syncFormFromUser(res.user);
      showToast('success', 'Profile & bank details saved.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Request Payout
  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    try {
      const res = await apiFetch<{ payoutRequestedAt: string }>('/api/payouts/request', {
        method: 'POST',
      });
      setTipsData((prev) => (prev ? { ...prev, payoutRequestedAt: res.payoutRequestedAt } : prev));
      setUser((prev) => (prev ? { ...prev, payout_requested_at: res.payoutRequestedAt } : prev));
      showToast('success', 'Payout request logged! Admin processes payouts every Friday.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not request payout.');
    } finally {
      setRequestingPayout(false);
    }
  };

  // Upgrade to Pro (₦1,000 / 30 days)
  const handleUpgradePro = () => {
    if (!user) return;
    if (!config?.paystackConfigured || !config.paystackPublicKey) {
      showToast(
        'error',
        'Paystack is not configured yet. Add PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY in Cloudflare Environment Variables.'
      );
      return;
    }

    setUpgradingPro(true);
    openPaystackPopup({
      publicKey: config.paystackPublicKey,
      email: user.email,
      amountKobo: config.proPriceKobo || 100000,
      metadata: {
        type: 'pro_subscription',
        username: user.username,
        user_id: user.id,
      },
      onSuccess: async (reference) => {
        try {
          const res = await apiFetch<{ verified: boolean; user: UserProfile }>('/api/payments/verify-pro', {
            method: 'POST',
            body: JSON.stringify({ reference }),
          });
          setUser(res.user);
          syncFormFromUser(res.user);
          showToast('success', 'Welcome to TAP9JA Pro! Unlimited links & all themes unlocked for 30 days.');
        } catch (err) {
          showToast('error', err instanceof Error ? err.message : 'Could not verify Pro payment.');
        } finally {
          setUpgradingPro(false);
        }
      },
      onCancel: () => setUpgradingPro(false),
      onError: (msg) => {
        setUpgradingPro(false);
        showToast('error', msg);
      },
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const navItems: Array<{ id: TabId; label: string; icon: typeof Link2 }> = [
    { id: 'links', label: 'Manage Links', icon: Link2 },
    { id: 'profile', label: 'Edit Profile', icon: UserCog },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'tips', label: 'Tips & Earnings', icon: Wallet },
    { id: 'pro', label: 'Upgrade to Pro', icon: Crown },
  ];

  const activeTabLabel = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';
  const proDaysLeft =
    user.is_pro && user.pro_expires_at
      ? Math.max(0, Math.ceil((new Date(user.pro_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 p-5 justify-between">
        <div className="space-y-6">
          <Link to="/" className="block px-1">
            <BrandMark />
          </Link>

          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.name} sizeClass="h-10 w-10" ringClass="ring-1 ring-slate-200" />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                {user.is_pro && <VerifiedBlueTick className="h-3.5 w-3.5" />}
              </div>
              <p className="text-xs font-mono-nums text-slate-500 truncate">@{user.username}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full h-11 px-3.5 rounded-2xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-emerald-600 to-purple-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-200">
          <div className="px-3 py-2 text-xs text-slate-500 space-y-1">
            <div>
              Plan:{' '}
              <span className="font-semibold text-slate-900">
                {user.is_pro ? `Pro (${proDaysLeft}d left)` : 'Free (5 links max)'}
              </span>
            </div>
            {user.is_pro && (
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <Zap className="h-3 w-3 shrink-0" />
                <span>Pro — Ad Free Support</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-10 px-3.5 rounded-2xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="lg:hidden">
              <BrandMark size="sm" />
            </Link>
            <span className="hidden lg:inline text-sm text-slate-500 whitespace-nowrap">
              Dashboard <span className="mx-1.5 text-slate-300">/</span>{' '}
              <span className="font-semibold text-slate-900">{activeTabLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyProfile}
              className="h-10 px-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copiedUrl ? 'Copied' : `tap9ja.com/u/${user.username}`}</span>
              <span className="sm:hidden">{copiedUrl ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
              aria-label="Show QR Code"
            >
              <QrCode className="h-4 w-4" />
            </button>
            <Link
              to={`/u/${user.username}`}
              target="_blank"
              className="h-10 px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>View Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Mobile Tab Strip */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-red-600 bg-red-50 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </button>
        </div>

        {/* Toast Feedback */}
        {toast && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              className={`max-w-4xl mx-auto rounded-2xl px-4 py-3 text-sm font-medium border ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.text}
            </div>
          </div>
        )}

        {/* Active Tab Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* TAB 1: MANAGE LINKS */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-display font-bold text-slate-950">Manage Links</h1>
                  <p className="text-sm text-slate-600">
                    Add, toggle, edit, and drag to reorder links on tap9ja.com/u/{user.username}.
                  </p>
                </div>
                <span className="text-xs font-mono-nums font-semibold text-slate-600">
                  {links.length} / {user.is_pro ? 'Unlimited' : '5'} links used
                </span>
              </div>

              {freeLinkLimitReached && (
                <div className="rounded-3xl bg-gradient-to-r from-emerald-950 to-purple-950 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-display font-bold text-base">
                      Free plan limited to 5 links — Upgrade to Pro ₦1,000/month for unlimited
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Pro also unlocks all 5 themes, blue verified tick, dual music embeds, and removes the watermark.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pro')}
                    className="h-11 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              )}

              {/* Add New Link Card */}
              <form
                onSubmit={handleAddLink}
                className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-display font-bold text-slate-900">Add New Link</h2>
                  {newUrl.trim() && (
                    <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                      Detected: <strong className="capitalize">{detectPlatform(newUrl).replace('_', ' ')}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    required
                    disabled={freeLinkLimitReached}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Button title (e.g. Follow on Instagram)"
                    className="sm:col-span-5 h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    required
                    disabled={freeLinkLimitReached}
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="sm:col-span-5 h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={addingLink || freeLinkLimitReached}
                    className="sm:col-span-2 h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-1.5 disabled:opacity-45 whitespace-nowrap"
                  >
                    {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Links List with Drag-and-Drop */}
              <div className="space-y-3">
                {links.length === 0 ? (
                  <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center">
                    <p className="font-display font-semibold text-slate-900">No links yet</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Add your Instagram, WhatsApp, Boomplay, or online store link above.
                    </p>
                  </div>
                ) : (
                  links.map((link, idx) => {
                    const isEditing = editingLinkId === link.id;
                    const hiddenOnFree = !user.is_pro && idx >= 5;
                    return (
                      <div
                        key={link.id}
                        draggable={!isEditing}
                        onDragStart={() => handleDragStart(link.id)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(link.id)}
                        className={`rounded-3xl bg-white border border-slate-200 p-4 transition-all ${
                          draggedId === link.id ? 'opacity-50' : ''
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                              />
                              <input
                                type="text"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="h-10 px-3.5 rounded-xl border border-slate-200 text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingLinkId(null)}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveLinkEdit(link.id)}
                                className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1 hidden sm:block"
                              title="Drag to reorder"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>

                            <PlatformBadgeIcon platform={link.platform} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate">{link.title}</p>
                                {hiddenOnFree && (
                                  <span className="text-[11px] font-semibold text-amber-700 shrink-0">
                                    Hidden on Free (Pro to unlock)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">
                                {link.url} · <span className="font-mono-nums">{link.clicks} clicks</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveLinkBy(idx, -1)}
                                disabled={idx === 0}
                                className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30"
                                aria-label="Move link up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLinkBy(idx, 1)}
                                disabled={idx === links.length - 1}
                                className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30"
                                aria-label="Move link down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>

                              {/* Active Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleLink(link)}
                                role="switch"
                                aria-checked={link.is_active}
                                aria-label={`Toggle ${link.title}`}
                                className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                                  link.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                    link.is_active ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkId(link.id);
                                  setEditTitle(link.title);
                                  setEditUrl(link.url);
                                }}
                                className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600"
                                aria-label="Edit link"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link.id)}
                                className="h-9 w-9 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-600"
                                aria-label="Delete link"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-slate-950">Edit Profile & Theme</h1>
                <p className="text-sm text-slate-600">
                  Customize how fans see you on tap9ja.com/u/{user.username} and set your Nigerian payout bank.
                </p>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-100">
                  <Avatar src={pAvatar} name={pName || user.name} sizeClass="h-20 w-20" ringClass="ring-2 ring-slate-200" />
                  <div className="flex-1">
                    <label htmlFor="profile-avatar" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Profile Picture URL
                    </label>
                    <input
                      id="profile-avatar"
                      type="text"
                      value={pAvatar}
                      onChange={(e) => setPAvatar(e.target.value)}
                      placeholder="https://i.ibb.co/..."
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Paste Instagram picture link or upload to imgbb.com and paste link here — No file upload
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Display Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-wa" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      WhatsApp Number (optional quick button)
                    </label>
                    <input
                      id="profile-wa"
                      type="text"
                      value={pWhatsapp}
                      onChange={(e) => setPWhatsapp(e.target.value)}
                      placeholder="+2348012345678"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Bio (max 300 characters)
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={3}
                    maxLength={300}
                    value={pBio}
                    onChange={(e) => setPBio(e.target.value)}
                    placeholder="Tell fans what you do..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-yt" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      YouTube Music / Video URL (embed)
                    </label>
                    <input
                      id="profile-yt"
                      type="text"
                      value={pYoutube}
                      onChange={(e) => setPYoutube(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-sp" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Spotify Track / Playlist URL (embed)
                    </label>
                    <input
                      id="profile-sp"
                      type="text"
                      value={pSpotify}
                      onChange={(e) => setPSpotify(e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* 5 Theme Selector */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-display font-bold text-slate-900">Bio Page Theme</h2>
                    <p className="text-xs text-slate-500">Light and Dark are free. Pro unlocks all 5 themes.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(Object.values(THEMES) as Array<(typeof THEMES)[ThemeId]>).map((t) => {
                    const locked = t.proOnly && !user.is_pro;
                    const selected = pTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            showToast('error', `${t.name} theme is for Pro creators (₦1,000/month).`);
                            return;
                          }
                          setPTheme(t.id);
                        }}
                        className={`relative rounded-2xl p-3 text-left border transition-all ${
                          selected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/25 bg-emerald-50/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        } ${locked ? 'opacity-75' : ''}`}
                      >
                        <div className={`h-14 rounded-xl bg-gradient-to-br ${t.previewGradient} border border-black/10 mb-2.5 flex items-end justify-end p-1.5`}>
                          {locked && (
                            <span className="h-6 w-6 rounded-lg bg-black/60 text-amber-300 flex items-center justify-center">
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{t.proOnly ? 'Pro' : 'Free'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nigerian Bank Details for Tip Payouts */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-display font-bold text-slate-900">Nigerian Bank Details (for Tips Payout)</h2>
                  <p className="text-xs text-slate-500">
                    Admin transfers your Friday tip payouts to this bank account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="bank-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bank Name
                    </label>
                    <select
                      id="bank-select"
                      value={pBankCode}
                      onChange={(e) => setPBankCode(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="">Select Nigerian bank</option>
                      {NIGERIAN_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="account-num" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Number (10 digits)
                    </label>
                    <input
                      id="account-num"
                      type="text"
                      maxLength={10}
                      value={pAccountNumber}
                      onChange={(e) => setPAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="0123456789"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm font-mono-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Name
                    </label>
                    <input
                      id="account-name"
                      type="text"
                      value={pAccountName}
                      onChange={(e) => setPAccountName(e.target.value)}
                      placeholder="Full account name"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-12 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-slate-950">Analytics</h1>
                <p className="text-sm text-slate-600">Real-time page views, link clicks, and tip performance.</p>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-3xl bg-white border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total Views</p>
                  <p className="text-2xl font-display font-bold font-mono-nums text-slate-950 mt-1">
                    {(analytics?.summary.totalViews ?? user.total_views).toLocaleString('en-NG')}
                  </p>
                </div>
                <div className="rounded-3xl bg-white border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total Link Clicks</p>
                  <p className="text-2xl font-display font-bold font-mono-nums text-slate-950 mt-1">
                    {(analytics?.summary.totalClicks ?? 0).toLocaleString('en-NG')}
                  </p>
                </div>
                <div className="rounded-3xl bg-white border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total Tips Amount</p>
                  <p className="text-2xl font-display font-bold font-mono-nums text-emerald-700 mt-1">
                    {formatNairaFromKobo(analytics?.summary.totalTipsGrossKobo ?? 0)}
                  </p>
                </div>
                <div className="rounded-3xl bg-white border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Pending Balance</p>
                  <p className="text-2xl font-display font-bold font-mono-nums text-purple-700 mt-1">
                    {formatNairaFromKobo(analytics?.summary.pendingBalanceKobo ?? user.pending_balance_kobo)}
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-white border border-slate-200 p-6">
                  <h2 className="text-base font-display font-bold text-slate-900 mb-4">Views (Last 7 Days)</h2>
                  <ViewsLineChart data={analytics?.viewsLast7Days ?? []} />
                </div>
                <div className="rounded-3xl bg-white border border-slate-200 p-6">
                  <h2 className="text-base font-display font-bold text-slate-900 mb-4">Clicks per Link</h2>
                  <ClicksBarChart data={analytics?.clicksPerLink ?? []} />
                </div>
              </div>

              {/* Recent Clicks Table */}
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-display font-bold text-slate-900">Recent Link Clicks</h2>
                </div>
                {!analytics || analytics.recentClicks.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No link clicks recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Link</th>
                          <th className="px-6 py-3 font-semibold">Platform</th>
                          <th className="px-6 py-3 font-semibold text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.recentClicks.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-3 font-medium text-slate-900">{c.link_title}</td>
                            <td className="px-6 py-3 text-slate-600 capitalize">{c.platform.replace('_', ' ')}</td>
                            <td className="px-6 py-3 text-right text-xs font-mono-nums text-slate-500">
                              {new Date(c.clicked_at).toLocaleString('en-NG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TIPS & EARNINGS */}
          {activeTab === 'tips' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-slate-950">Tips & Earnings</h1>
                <p className="text-sm text-slate-600">
                  90% of every verified Paystack tip goes to you (10% platform commission).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-gradient-to-br from-emerald-950 to-slate-950 text-white p-6 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">Pending Balance (Available)</p>
                    <p className="text-4xl font-display font-extrabold font-mono-nums mt-2">
                      {formatNairaFromKobo(tipsData?.pendingBalanceKobo ?? user.pending_balance_kobo)}
                    </p>
                    <p className="text-xs text-slate-300 mt-2">Payouts done every Friday by admin</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                    <span className="text-xs text-slate-300">
                      {tipsData?.payoutRequestedAt
                        ? `Requested: ${new Date(tipsData.payoutRequestedAt).toLocaleDateString('en-NG')}`
                        : user.account_number
                          ? `${user.bank_name} · ${user.account_number}`
                          : 'Add bank details in Edit Profile'}
                    </span>
                    <button
                      type="button"
                      disabled={requestingPayout || (tipsData?.pendingBalanceKobo ?? user.pending_balance_kobo) <= 0}
                      onClick={handleRequestPayout}
                      className="h-10 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-45 whitespace-nowrap"
                    >
                      {requestingPayout ? 'Requesting...' : 'Request Payout'}
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-slate-200 p-6 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Total Lifetime Earnings (Net 90%)</p>
                    <p className="text-4xl font-display font-extrabold font-mono-nums text-slate-950 mt-2">
                      {formatNairaFromKobo(tipsData?.totalEarningsKobo ?? user.total_earnings_kobo)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Share your tap9ja.com/u/{user.username} link so supporters can tap Support Me.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                    <HeartHandshake className="h-4 w-4 text-emerald-600" />
                    <span>All tips are verified with Paystack before crediting.</span>
                  </div>
                </div>
              </div>

              {/* Tips Table */}
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-display font-bold text-slate-900">Supporter Tips</h2>
                </div>
                {!tipsData || tipsData.tips.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No tips received yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-semibold">From</th>
                          <th className="px-6 py-3 font-semibold">Note</th>
                          <th className="px-6 py-3 font-semibold text-right">Amount</th>
                          <th className="px-6 py-3 font-semibold text-right">Your Net (90%)</th>
                          <th className="px-6 py-3 font-semibold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tipsData.tips.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-3 font-semibold text-slate-900">{t.from_name}</td>
                            <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{t.message || '—'}</td>
                            <td className="px-6 py-3 text-right font-mono-nums text-slate-700">
                              {formatNairaFromKobo(t.amount_kobo)}
                            </td>
                            <td className="px-6 py-3 text-right font-mono-nums font-semibold text-emerald-700">
                              {formatNairaFromKobo(t.net_kobo)}
                            </td>
                            <td className="px-6 py-3 text-right text-xs font-mono-nums text-slate-500">
                              {new Date(t.created_at).toLocaleDateString('en-NG')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: UPGRADE TO PRO */}
          {activeTab === 'pro' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-slate-950">TAP9JA Pro Membership</h1>
                <p className="text-sm text-slate-600">
                  Monthly subscription (₦{(config?.proPriceNgn ?? 1000).toLocaleString('en-NG')} / 30 days) — renew
                  anytime to keep all Pro perks active.
                </p>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-950 to-purple-950 text-white p-7 sm:p-9 border border-emerald-400/20 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <Crown className="h-4 w-4" />
                      <span>
                        {user.is_pro
                          ? `Pro Active · Expires ${new Date(user.pro_expires_at || '').toLocaleDateString('en-NG')} (${proDaysLeft} days left)`
                          : 'Currently on Free Plan'}
                      </span>
                    </div>
                    <h2 className="text-3xl font-display font-extrabold">
                      ₦{(config?.proPriceNgn ?? 1000).toLocaleString('en-NG')}{' '}
                      <span className="text-base font-normal text-slate-300">/ 30 days</span>
                    </h2>
                    <p className="text-sm text-slate-300 max-w-lg">
                      {user.is_pro
                        ? 'You can extend your Pro subscription by another 30 days anytime.'
                        : 'Unlock unlimited links, verified blue tick, all 5 themes, dual music embeds, and remove the TAP9JA watermark.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={upgradingPro}
                    onClick={handleUpgradePro}
                    className="h-12 px-7 rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white text-sm font-bold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-lg disabled:opacity-60"
                  >
                    {upgradingPro ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" />
                        {user.is_pro
                          ? `Extend Pro (+30 days · ₦${(config?.proPriceNgn ?? 1000).toLocaleString('en-NG')})`
                          : `Pay ₦${(config?.proPriceNgn ?? 1000).toLocaleString('en-NG')} to Go Pro`}
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {[
                    'Unlimited links on your bio page',
                    'Dual YouTube & Spotify music embeds',
                    'All 5 themes (Naija Green, Purple Hustle, Sunset)',
                    'Hide TAP9JA.com footer watermark',
                    'Verified blue tick beside your name',
                    'Full analytics charts & priority support',
                  ].map((perk) => (
                    <div key={perk} className="flex items-center gap-2.5 text-slate-100">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <QrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        username={user.username}
        displayName={user.name}
      />

      {!user.is_pro && adConfig?.adsEnabled && (
        <FreePlanAdModal
          open={dashAdOpen}
          mode="dashboard"
          creatorUsername={user.username}
          adCode={adConfig.adCode}
          onAutoClose={() => setDashAdOpen(false)}
          onUpgradeClick={() => {
            setDashAdOpen(false);
            setActiveTab('pro');
          }}
        />
      )}
    </div>
  );
}
