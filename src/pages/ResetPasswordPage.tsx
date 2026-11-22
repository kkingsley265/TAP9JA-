import { ArrowRight, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { PasswordInput } from '../components/PasswordInput';
import { apiFetch } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState((searchParams.get('email') || '').trim().toLowerCase());
  const [code, setCode] = useState((searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(code.trim())) {
      setError('Please enter the 6-digit security code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/auth/reset-password', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      setSuccessMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
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
            to="/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
          >
            Back to Log in
          </Link>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-8">
          {successMessage ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-950">Password updated</h1>
              <p className="text-sm text-slate-600">{successMessage}</p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  Log In Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-950">Set a new password</h1>
              <p className="text-sm text-slate-600 mt-1.5">
                Enter your email, the 6-digit security code sent to your inbox, and choose a new password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit Security Code
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full h-11 px-4 rounded-2xl border border-slate-200 text-sm font-mono-nums tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <PasswordInput
                    id="reset-new-password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="reset-confirm-password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-5">
                Need a new code?{' '}
                <Link to="/forgot-password" className="font-semibold text-emerald-700 hover:underline">
                  Request another code
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-8">
        <Link to="/" className="hover:text-slate-800">
          Back to TAP9JA.com
        </Link>
      </p>
    </div>
  );
}
