import {
  Ban,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  Loader2,
  LogOut,
  Megaphone,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { PasswordInput } from '../components/PasswordInput';
import { apiFetch, getAdminToken, setAdminToken, type UserProfile } from '../lib/api';
import { formatNairaFromKobo, PRODUCT_TYPES, THEMES, type ProductType, type ThemeId } from '../shared/platforms';

type AdminTab = 'stats' | 'users' | 'products' | 'tips' | 'payouts' | 'pro' | 'ads';

interface AdminOverview {
  stats: {
    totalUsers: number;
    freeUsers: number;
    proUsers: number;
    totalTipsVolumeKobo: number;
    totalCommissionKobo: number;
    totalPendingPayoutKobo: number;
    totalProRevenueKobo: number;
    totalProPaymentsCount: number;
    totalPlatformSupportKobo?: number;
    totalPlatformSupportCount?: number;
  };
  users: UserProfile[];
  tips: Array<{
    id: string;
    to_username: string;
    from_name: string;
    from_email: string;
    message: string;
    amount_kobo: number;
    commission_kobo: number;
    net_kobo: number;
    paystack_reference: string;
    created_at: string;
  }>;
  proPayments: Array<{
    id: string;
    username: string;
    amount_kobo: number;
    paystack_reference: string;
    expires_at: string;
    created_at: string;
  }>;
  payoutQueue: UserProfile[];
  storeStats?: {
    totalProducts: number;
    activeProducts: number;
    totalSales: number;
    totalStoreRevenueKobo: number;
    totalStoreCommissionKobo: number;
    freeThemeUsers: number;
    premiumThemeUsers: number;
    themeCounts: Record<string, number>;
  };
  recentProductSales?: Array<{
    id: string;
    product_id: string;
    product_title: string;
    product_type: ProductType;
    seller_username: string;
    buyer_email_masked: string;
    amount_kobo: number;
    commission_kobo: number;
    net_kobo: number;
    paystack_reference: string;
    created_at: string;
  }>;
  payoutHistory: Array<{
    id: string;
    username: string;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    amount_kobo: number;
    paid_at: string;
  }>;
  platformSupports?: Array<{
    id: string;
    supporter_name: string;
    supporter_email_masked: string;
    source_username: string;
    amount_kobo: number;
    paystack_reference: string;
    receipt_sent: boolean;
    created_at: string;
  }>;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<AdminTab>('stats');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [tipSearch, setTipSearch] = useState('');
  const [tipDateFilter, setTipDateFilter] = useState('');
  const [tipMinNgn, setTipMinNgn] = useState('');
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);
  const [markingPaid, setMarkingPaid] = useState(false);

  // Ad Settings state (stored in DB; NEVER rendered/executed inside Admin Console)
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adCode, setAdCode] = useState('');
  const [adUpdatedAt, setAdUpdatedAt] = useState<string | null>(null);
  const [savingAds, setSavingAds] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    try {
      const [res, adRes] = await Promise.all([
        apiFetch<AdminOverview>('/api/admin/overview', { authMode: 'admin' }),
        apiFetch<{ adsEnabled: boolean; adCode: string; updatedAt: string | null }>('/api/admin/ad-settings', {
          authMode: 'admin',
        }),
      ]);
      setData(res);
      setAdsEnabled(adRes.adsEnabled);
      setAdCode(adRes.adCode);
      setAdUpdatedAt(adRes.updatedAt);
    } catch {
      setAdminToken(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadOverview();
  }, [token, loadOverview]);

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/admin/login', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setAdminToken(res.token);
      setToken(res.token);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Admin login failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setToken(null);
    setData(null);
  };

  const handleToggleBlock = async (userId: string) => {
    await apiFetch(`/api/admin/users/${userId}/toggle-block`, { method: 'POST', authMode: 'admin' });
    await loadOverview();
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Delete @${username} and all their links permanently?`)) return;
    await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE', authMode: 'admin' });
    await loadOverview();
  };

  const handleMarkPaid = async () => {
    if (selectedPayoutIds.length === 0) return;
    setMarkingPaid(true);
    try {
      const res = await apiFetch<{ processedCount: number }>('/api/admin/payouts/mark-paid', {
        method: 'POST',
        authMode: 'admin',
        body: JSON.stringify({ userIds: selectedPayoutIds }),
      });
      setSelectedPayoutIds([]);
      setMessage(`Marked ${res.processedCount} creator payout(s) as paid.`);
      await loadOverview();
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleSaveAdSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAds(true);
    setMessage('');
    try {
      const res = await apiFetch<{ adsEnabled: boolean; adCode: string; updatedAt: string | null }>(
        '/api/admin/ad-settings',
        {
          method: 'PUT',
          authMode: 'admin',
          body: JSON.stringify({ adsEnabled, adCode }),
        }
      );
      setAdsEnabled(res.adsEnabled);
      setAdCode(res.adCode);
      setAdUpdatedAt(res.updatedAt);
      setMessage(
        res.adsEnabled
          ? 'Free Plan Ads enabled and saved. Ads will run only on Free creator dashboards and Free link clicks.'
          : 'Free Plan Ads disabled and settings saved.'
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save ad settings.');
    } finally {
      setSavingAds(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['username', 'bank_code', 'bank_name', 'account_number', 'account_name', 'amount_ngn', 'requested_at'],
      ...data.payoutQueue.map((u) => [
        u.username,
        u.bank_code || '',
        u.bank_name || '',
        u.account_number || '',
        u.account_name || u.name,
        (u.pending_balance_kobo / 100).toFixed(2),
        u.payout_requested_at || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tap9ja-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
    );
  }, [data, userSearch]);

  const filteredTips = useMemo(() => {
    if (!data) return [];
    const q = tipSearch.trim().toLowerCase();
    const minKobo = tipMinNgn ? Number(tipMinNgn) * 100 : 0;
    return data.tips.filter((t) => {
      if (q && !t.from_name.toLowerCase().includes(q) && !t.to_username.toLowerCase().includes(q)) return false;
      if (tipDateFilter && !t.created_at.startsWith(tipDateFilter)) return false;
      if (minKobo > 0 && t.amount_kobo < minKobo) return false;
      return true;
    });
  }, [data, tipSearch, tipDateFilter, tipMinNgn]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 p-7 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <BrandMark lightText />
            <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> Admin
            </span>
          </div>

          <h1 className="text-2xl font-display font-bold">TAP9JA Admin Console</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Sign in with the ADMIN_EMAIL and ADMIN_PASSWORD configured in Cloudflare Environment Variables.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tap9ja.com"
                className="w-full h-11 px-4 rounded-2xl bg-zinc-950 border border-white/15 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Admin Password
              </label>
              <PasswordInput
                id="admin-password"
                variant="dark"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="rounded-2xl bg-red-500/15 border border-red-400/30 px-4 py-3 text-xs text-red-200">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2"
            >
              {loggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In to Admin
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-zinc-400 hover:text-white">
              ← Return to TAP9JA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <BrandMark size="sm" />
          </Link>
          <span className="text-xs font-semibold text-slate-500">Admin Console</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="h-10 px-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Segmented Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'stats' as AdminTab, label: 'Overview Stats', icon: Users },
            { id: 'users' as AdminTab, label: 'Users', icon: Users },
            { id: 'products' as AdminTab, label: 'Products & Themes', icon: ShoppingBag },
            { id: 'tips' as AdminTab, label: 'Tips', icon: CreditCard },
            { id: 'payouts' as AdminTab, label: `Payouts (${data?.payoutQueue.length ?? 0})`, icon: Wallet },
            { id: 'pro' as AdminTab, label: 'Pro Payments', icon: Crown },
            { id: 'ads' as AdminTab, label: 'Ad Settings', icon: Megaphone },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`h-10 px-4 rounded-2xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-purple-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {message && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        )}

        {loading && !data ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : data ? (
          <>
            {/* TAB A: STATS */}
            {tab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: data.stats.totalUsers.toLocaleString('en-NG') },
                    { label: 'Free Users', value: data.stats.freeUsers.toLocaleString('en-NG') },
                    { label: 'Active Pro Users', value: data.stats.proUsers.toLocaleString('en-NG') },
                    { label: 'Total Tips Volume', value: formatNairaFromKobo(data.stats.totalTipsVolumeKobo) },
                    { label: 'Total Commission (10%)', value: formatNairaFromKobo(data.stats.totalCommissionKobo) },
                    { label: 'Total Pending Payout', value: formatNairaFromKobo(data.stats.totalPendingPayoutKobo) },
                    {
                      label: 'Total Pro Payments',
                      value: `${formatNairaFromKobo(data.stats.totalProRevenueKobo)} (${data.stats.totalProPaymentsCount})`,
                    },
                    {
                      label: 'TAP9JA Support (100% Admin)',
                      value: `${formatNairaFromKobo(data.stats.totalPlatformSupportKobo ?? 0)} (${data.stats.totalPlatformSupportCount ?? 0})`,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-3xl bg-white border border-slate-200 p-6">
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-display font-extrabold font-mono-nums text-slate-950 mt-2">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* TAP9JA Platform Support Donations (100% Admin) */}
                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-display font-bold text-slate-950">
                        Support TAP9JA Contributions ({data.platformSupports?.length ?? 0})
                      </h2>
                      <p className="text-xs text-slate-500">
                        100% of Support TAP9JA ❤️ contributions go directly to Admin earnings.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Supporter</th>
                          <th className="px-5 py-3 font-semibold">Email (Masked)</th>
                          <th className="px-5 py-3 font-semibold">Source Page</th>
                          <th className="px-5 py-3 font-semibold text-right">Amount</th>
                          <th className="px-5 py-3 font-semibold">Receipt</th>
                          <th className="px-5 py-3 font-semibold">Reference</th>
                          <th className="px-5 py-3 font-semibold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!data.platformSupports || data.platformSupports.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                              No TAP9JA support contributions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          data.platformSupports.map((sup) => (
                            <tr key={sup.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3 font-medium text-slate-900">{sup.supporter_name}</td>
                              <td className="px-5 py-3 font-mono-nums text-xs text-slate-600">
                                {sup.supporter_email_masked}
                              </td>
                              <td className="px-5 py-3 text-xs font-semibold text-emerald-700">
                                {sup.source_username ? `@${sup.source_username}` : '—'}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums font-bold text-purple-700">
                                {formatNairaFromKobo(sup.amount_kobo)}
                              </td>
                              <td className="px-5 py-3 text-xs">
                                {sup.receipt_sent ? (
                                  <span className="text-emerald-700 font-semibold">Email Sent</span>
                                ) : (
                                  <span className="text-slate-500">Paystack Receipt</span>
                                )}
                              </td>
                              <td className="px-5 py-3 font-mono-nums text-xs text-slate-500">
                                {sup.paystack_reference}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums text-xs text-slate-500">
                                {new Date(sup.created_at).toLocaleString('en-NG')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB B: USERS */}
            {tab === 'users' && (
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-base font-display font-bold">All Creators ({filteredUsers.length})</h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search username or email..."
                      className="w-full h-10 pl-10 pr-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Username</th>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">Pro</th>
                        <th className="px-5 py-3 font-semibold text-right">Pending</th>
                        <th className="px-5 py-3 font-semibold text-right">Earnings</th>
                        <th className="px-5 py-3 font-semibold text-right">Views</th>
                        <th className="px-5 py-3 font-semibold">Joined</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-semibold">
                            <Link to={`/u/${u.username}`} target="_blank" className="text-emerald-700 hover:underline">
                              @{u.username}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-slate-600">{u.email}</td>
                          <td className="px-5 py-3 text-xs font-semibold">
                            {u.is_pro ? (
                              <span className="text-purple-700">Pro</span>
                            ) : (
                              <span className="text-slate-500">Free</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-nums">
                            {formatNairaFromKobo(u.pending_balance_kobo)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-nums">
                            {formatNairaFromKobo(u.total_earnings_kobo)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-nums">{u.total_views}</td>
                          <td className="px-5 py-3 text-xs font-mono-nums text-slate-500">
                            {new Date(u.created_at).toLocaleDateString('en-NG')}
                          </td>
                          <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(u.id)}
                              className={`h-8 px-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 ${
                                u.is_blocked
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              {u.is_blocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="h-8 px-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB B2: DIGITAL PRODUCTS & THEME STATS */}
            {tab === 'products' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Total Products',
                      value: `${(data.storeStats?.totalProducts ?? 0).toLocaleString('en-NG')} (${data.storeStats?.activeProducts ?? 0} active)`,
                    },
                    {
                      label: 'Total Store Sales',
                      value: (data.storeStats?.totalSales ?? 0).toLocaleString('en-NG'),
                    },
                    {
                      label: 'Total Store Revenue',
                      value: formatNairaFromKobo(data.storeStats?.totalStoreRevenueKobo ?? 0),
                    },
                    {
                      label: 'Platform Store Commission (10%)',
                      value: formatNairaFromKobo(data.storeStats?.totalStoreCommissionKobo ?? 0),
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-3xl bg-white border border-slate-200 p-6">
                      <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                      <p className="text-2xl font-display font-extrabold font-mono-nums text-slate-950 mt-2">
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Theme Usage Breakdown */}
                <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-purple-700" />
                      <h2 className="text-base font-display font-bold text-slate-950">Theme Usage Stats</h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                        Free Themes: {data.storeStats?.freeThemeUsers ?? 0}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-800">
                        Premium Themes: {data.storeStats?.premiumThemeUsers ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {(Object.values(THEMES) as Array<(typeof THEMES)[ThemeId]>).map((t) => {
                      const count = data.storeStats?.themeCounts?.[t.id] ?? 0;
                      return (
                        <div key={t.id} className="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                          <p className="text-[10px] font-bold uppercase text-slate-500">{t.tag}</p>
                          <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{t.name}</p>
                          <p className="text-lg font-display font-extrabold font-mono-nums text-slate-950 mt-1">
                            {count}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Product Sales (Masked Buyer Email & NO external product links) */}
                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-display font-bold text-slate-950">
                        Recent Product Sales ({data.recentProductSales?.length ?? 0})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Buyer emails are privacy-masked and product delivery links are never shown in Admin.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Product</th>
                          <th className="px-5 py-3 font-semibold">Seller</th>
                          <th className="px-5 py-3 font-semibold">Buyer (Masked)</th>
                          <th className="px-5 py-3 font-semibold text-right">Amount</th>
                          <th className="px-5 py-3 font-semibold text-right">Fee (10%)</th>
                          <th className="px-5 py-3 font-semibold text-right">Creator Net</th>
                          <th className="px-5 py-3 font-semibold">Reference</th>
                          <th className="px-5 py-3 font-semibold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {!data.recentProductSales || data.recentProductSales.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                              No digital product sales recorded yet.
                            </td>
                          </tr>
                        ) : (
                          data.recentProductSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50/70">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-900">{sale.product_title}</p>
                                <p className="text-[11px] text-slate-500">
                                  {PRODUCT_TYPES[sale.product_type]?.shortLabel || sale.product_type}
                                </p>
                              </td>
                              <td className="px-5 py-3 font-semibold text-emerald-700">@{sale.seller_username}</td>
                              <td className="px-5 py-3 font-mono-nums text-xs text-slate-600">
                                {sale.buyer_email_masked}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums">
                                {formatNairaFromKobo(sale.amount_kobo)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums text-purple-700">
                                {formatNairaFromKobo(sale.commission_kobo)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums font-semibold">
                                {formatNairaFromKobo(sale.net_kobo)}
                              </td>
                              <td className="px-5 py-3 font-mono-nums text-xs text-slate-500">
                                {sale.paystack_reference}
                              </td>
                              <td className="px-5 py-3 text-right font-mono-nums text-xs text-slate-500">
                                {new Date(sale.created_at).toLocaleString('en-NG')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB C: TIPS */}
            {tab === 'tips' && (
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={tipSearch}
                    onChange={(e) => setTipSearch(e.target.value)}
                    placeholder="Filter from_name or to_username..."
                    className="h-10 px-4 rounded-2xl border border-slate-200 text-sm flex-1 min-w-[200px]"
                  />
                  <input
                    type="date"
                    value={tipDateFilter}
                    onChange={(e) => setTipDateFilter(e.target.value)}
                    className="h-10 px-3.5 rounded-2xl border border-slate-200 text-sm"
                  />
                  <input
                    type="number"
                    value={tipMinNgn}
                    onChange={(e) => setTipMinNgn(e.target.value)}
                    placeholder="Min ₦"
                    className="h-10 w-28 px-3.5 rounded-2xl border border-slate-200 text-sm font-mono-nums"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">From</th>
                        <th className="px-5 py-3 font-semibold">To Creator</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                        <th className="px-5 py-3 font-semibold text-right">Fee (10%)</th>
                        <th className="px-5 py-3 font-semibold text-right">Creator Net</th>
                        <th className="px-5 py-3 font-semibold">Reference</th>
                        <th className="px-5 py-3 font-semibold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTips.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                            No tip transactions match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredTips.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3 font-medium">{t.from_name}</td>
                            <td className="px-5 py-3 font-semibold text-emerald-700">@{t.to_username}</td>
                            <td className="px-5 py-3 text-right font-mono-nums">{formatNairaFromKobo(t.amount_kobo)}</td>
                            <td className="px-5 py-3 text-right font-mono-nums text-purple-700">
                              {formatNairaFromKobo(t.commission_kobo)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono-nums font-semibold">
                              {formatNairaFromKobo(t.net_kobo)}
                            </td>
                            <td className="px-5 py-3 font-mono-nums text-xs text-slate-500">{t.paystack_reference}</td>
                            <td className="px-5 py-3 text-right font-mono-nums text-xs text-slate-500">
                              {new Date(t.created_at).toLocaleString('en-NG')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB D: PAYOUTS */}
            {tab === 'payouts' && (
              <div className="space-y-6">
                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-display font-bold">
                        Pending Creator Payouts ({data.payoutQueue.length})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Select creators after transferring via your bank app, then click Mark as Paid.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={data.payoutQueue.length === 0}
                        className="h-10 px-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-45"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkPaid}
                        disabled={selectedPayoutIds.length === 0 || markingPaid}
                        className="h-10 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-45"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {markingPaid ? 'Processing...' : `Mark as Paid (${selectedPayoutIds.length})`}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-5 py-3 w-10">
                            <input
                              type="checkbox"
                              aria-label="Select all payouts"
                              checked={
                                data.payoutQueue.length > 0 && selectedPayoutIds.length === data.payoutQueue.length
                              }
                              onChange={(e) =>
                                setSelectedPayoutIds(e.target.checked ? data.payoutQueue.map((u) => u.id) : [])
                              }
                            />
                          </th>
                          <th className="px-5 py-3 font-semibold">Username</th>
                          <th className="px-5 py-3 font-semibold">Bank Code / Name</th>
                          <th className="px-5 py-3 font-semibold">Account Number</th>
                          <th className="px-5 py-3 font-semibold">Account Name</th>
                          <th className="px-5 py-3 font-semibold text-right">Amount to Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.payoutQueue.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                              No pending payouts right now.
                            </td>
                          </tr>
                        ) : (
                          data.payoutQueue.map((u) => {
                            const checked = selectedPayoutIds.includes(u.id);
                            return (
                              <tr key={u.id} className="hover:bg-slate-50/70">
                                <td className="px-5 py-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setSelectedPayoutIds((prev) =>
                                        e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-5 py-3 font-semibold">@{u.username}</td>
                                <td className="px-5 py-3 text-slate-600">
                                  {u.bank_code ? `${u.bank_code} · ${u.bank_name}` : 'Bank not set'}
                                </td>
                                <td className="px-5 py-3 font-mono-nums">{u.account_number || '—'}</td>
                                <td className="px-5 py-3">{u.account_name || u.name}</td>
                                <td className="px-5 py-3 text-right font-mono-nums font-bold text-emerald-700">
                                  {formatNairaFromKobo(u.pending_balance_kobo)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB E: PRO PAYMENTS */}
            {tab === 'pro' && (
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="text-base font-display font-bold">
                    Pro Subscription Payments ({data.proPayments.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Username</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                        <th className="px-5 py-3 font-semibold">Paystack Reference</th>
                        <th className="px-5 py-3 font-semibold text-right">Paid Date</th>
                        <th className="px-5 py-3 font-semibold text-right">Expires At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.proPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                            No Pro subscription payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        data.proPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-3 font-semibold text-purple-700">@{p.username}</td>
                            <td className="px-5 py-3 text-right font-mono-nums font-semibold">
                              {formatNairaFromKobo(p.amount_kobo)}
                            </td>
                            <td className="px-5 py-3 font-mono-nums text-xs text-slate-500">{p.paystack_reference}</td>
                            <td className="px-5 py-3 text-right font-mono-nums text-xs text-slate-500">
                              {new Date(p.created_at).toLocaleDateString('en-NG')}
                            </td>
                            <td className="px-5 py-3 text-right font-mono-nums text-xs text-slate-700">
                              {new Date(p.expires_at).toLocaleDateString('en-NG')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB F: AD SETTINGS */}
            {tab === 'ads' && (
              <form onSubmit={handleSaveAdSettings} className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div>
                    <h2 className="text-lg font-display font-bold text-slate-950">Free Plan Ad Settings</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      100% of ad revenue goes to admin. Active Pro users and their supporters see zero ads.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={adsEnabled}
                    onClick={() => setAdsEnabled((prev) => !prev)}
                    className={`h-11 px-5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-colors shrink-0 ${
                      adsEnabled
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <span>{adsEnabled ? 'Free Plan Ads: ON' : 'Free Plan Ads: OFF'}</span>
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-800">Where this ad code loads:</p>
                  <p>• Free / Expired Pro public bio links: 5-second interstitial once every 30 minutes per visitor.</p>
                  <p>• Free / Expired Pro creator dashboard: 6-second auto-closing break every 5 minutes.</p>
                  <p>• Never loads on Landing, Login, Register, Forgot Password, Paystack Tip Jar, Admin, or Pro profiles.</p>
                </div>

                <div>
                  <label htmlFor="admin-ad-code" className="block text-xs font-semibold text-slate-700 mb-2">
                    Monetag or Google AdSense Snippet (HTML / Script)
                  </label>
                  <textarea
                    id="admin-ad-code"
                    rows={8}
                    value={adCode}
                    onChange={(e) => setAdCode(e.target.value)}
                    placeholder="Paste your Monetag or Google AdSense banner/interstitial script tag here..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Stored safely in the database and never executed inside the Admin Console.
                    {adUpdatedAt ? ` Last updated: ${new Date(adUpdatedAt).toLocaleString('en-NG')}.` : ''}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAds}
                    className="h-11 px-7 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {savingAds && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Ad Settings
                  </button>
                </div>
              </form>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
