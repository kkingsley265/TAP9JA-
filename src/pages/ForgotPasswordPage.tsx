import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { apiFetch } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSentMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process request right now.');
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
          {sentMessage ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-950">Check your email</h1>
              <p className="text-sm text-slate-600 leading-relaxed">{sentMessage}</p>
              <p className="text-xs text-slate-500">
                Codes expire in 15 minutes. Check your spam folder if you don&apos;t see it within a minute.
              </p>
              <div className="pt-2 space-y-2.5">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  Enter Reset Code
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSentMessage('')}
                  className="w-full h-11 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Try another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-950">Forgot your password?</h1>
              <p className="text-sm text-slate-600 mt-1.5">
                Enter your registered email address and we&apos;ll send you a 6-digit security code and reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-white text-sm font-semibold hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset code...
                    </>
                  ) : (
                    <>
                      Send Security Code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-5">
                Already have a code?{' '}
                <Link to="/reset-password" className="font-semibold text-emerald-700 hover:underline">
                  Reset password now
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
