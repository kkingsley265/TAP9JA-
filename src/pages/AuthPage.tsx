import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { apiFetch, getUserToken, setUserToken, type UserProfile } from '../lib/api';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUsername = (searchParams.get('username') || '').toLowerCase().replace(/[^a-z0-9_]/g, '');

  const [name, setName] = useState('');
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });

  useEffect(() => {
    if (getUserToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (mode !== 'register') return;
    const cleaned = username.trim().toLowerCase();
    if (!cleaned) {
      setUsernameStatus({ checking: false, available: null, reason: null });
      return;
    }

    setUsernameStatus((s) => ({ ...s, checking: true }));
    const timer = setTimeout(() => {
      apiFetch<{ available: boolean; reason: string | null }>(
        `/api/auth/check-username?username=${encodeURIComponent(cleaned)}`,
        { authMode: 'none' }
      )
        .then((res) => setUsernameStatus({ checking: false, available: res.available, reason: res.reason }))
        .catch(() => setUsernameStatus({ checking: false, available: null, reason: null }));
    }, 280);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', {
          method: 'POST',
          authMode: 'none',
          body: JSON.stringify({
            name: name.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });
        setUserToken(res.token);
        navigate('/dashboard', { replace: true });
      } else {
        const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
          method: 'POST',
          authMode: 'none',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });
        setUserToken(res.token);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <BrandMark />
          </Link>
          <Link
            to={mode === 'login' ? '/register' : '/login'}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
          >
            {mode === 'login' ? 'Create account' : 'Log in'}
          </Link>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-8">
          <h1 className="text-2xl font-display font-bold text-slate-950">
            {mode === 'register' ? 'Claim your TAP9JA link' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            {mode === 'register'
              ? 'One link for your socials, music, shop, and Paystack tips.'
              : 'Sign in to manage your links, profile, and Naira earnings.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name or Brand Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tems Vibes"
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="auth-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username (permanent link)
                  </label>
                  <div className="flex items-center h-11 px-3.5 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500 bg-white">
                    <span className="text-xs sm:text-sm font-medium text-slate-400 select-none shrink-0">
                      tap9ja.com/u/
                    </span>
                    <input
                      id="auth-username"
                      type="text"
                      required
                      minLength={3}
                      maxLength={20}
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none ml-0.5"
                    />
                    {usernameStatus.checking && <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />}
                    {!usernameStatus.checking && usernameStatus.available === true && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    {!usernameStatus.checking && usernameStatus.available === false && (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                  </div>
                  {usernameStatus.reason ? (
                    <p className="text-xs text-red-600 mt-1">{usernameStatus.reason}</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      Lowercase letters, numbers, underscores only (3–20 chars). Never changes.
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && usernameStatus.available === false)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'register' ? 'Creating your page...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {mode === 'register' ? 'Create My Free Link' : 'Log In to Dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-8">
        <Link to="/" className="hover:text-slate-800">
          Back to TAP9JA.com
        </Link>
        <span className="mx-2">·</span>
        <Link to="/admin" className="hover:text-slate-800">
          Admin Console
        </Link>
      </p>
    </div>
  );
}
