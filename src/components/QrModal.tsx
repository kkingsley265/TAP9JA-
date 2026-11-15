import { Check, Copy, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface QrModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
}

export function QrModal({ open, onClose, username, displayName }: QrModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const profileUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/u/${username}` : `https://tap9ja.com/u/${username}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(profileUrl, {
      width: 560,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [open, profileUrl]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `tap9ja-${username}-qr.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 id="qr-modal-title" className="text-lg font-display font-bold">
              Share {displayName}
            </h2>
            <p className="text-xs text-slate-500">Scan to open tap9ja.com/u/{username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Close QR dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-center p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for @${username}`} className="w-56 h-56 rounded-xl" />
          ) : (
            <div className="w-56 h-56 rounded-xl bg-slate-200 animate-pulse" />
          )}
        </div>

        <div className="text-center text-xs font-mono-nums text-slate-600 bg-slate-100 rounded-xl px-3 py-2 mb-4 truncate">
          {profileUrl}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="h-11 px-4 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-purple-700 text-sm font-semibold text-white hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Save QR
          </button>
        </div>
      </div>
    </div>
  );
}
