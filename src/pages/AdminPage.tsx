import {
  Ban,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { PasswordInput } from '../components/PasswordInput';
import { apiFetch, getAdminToken, setAdminToken, type UserProfile } from '../lib/api';
import { formatNairaFromKobo } from '../shared/platforms';

type AdminTab = 'stats' | 'users' | 'tips' | 'payouts' | 'pro';

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

  const loadOverview = useCallback(async () => {
    if (!getAdminToken()) return;
    setLoading(true);
    try {
      const res = await apiFetch<AdminOverview>('/api/admin/overview', { authMode: 'admin' });
      setData(res);
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
            { id: 'tips' as AdminTab, label: 'Tips', icon: CreditCard },
            { id: 'payouts' as AdminTab, label: `Payouts (${data?.payoutQueue.length ?? 0})`, icon: Wallet },
            { id: 'pro' as AdminTab, label: 'Pro Payments', icon: Crown },
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
                ].map((stat) => (
                  <div key={stat.label} className="rounded-3xl bg-white border border-slate-200 p-6">
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-display font-extrabold font-mono-nums text-slate-950 mt-2">
                      {stat.value}
                    </p>
                  </div>
                ))}
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
          </>
        ) : null}
      </div>
    </div>
  );
}
