import {
  Calendar,
  Facebook,
  Globe,
  Headphones,
  Instagram,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Radio,
  Send,
  ShoppingBag,
  Youtube,
} from 'lucide-react';
import { PLATFORMS, type PlatformId } from '../shared/platforms';

interface PlatformIconProps {
  platform: PlatformId;
  className?: string;
}

export function PlatformBadgeIcon({ platform }: { platform: PlatformId }) {
  const meta = PLATFORMS[platform] || PLATFORMS.custom;
  return (
    <span className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.accentBg} ${meta.accentText}`}>
      <PlatformGlyph platform={platform} className="h-5 w-5" />
    </span>
  );
}

export function PlatformGlyph({ platform, className = 'h-5 w-5' }: PlatformIconProps) {
  switch (platform) {
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <Facebook className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'whatsapp':
      return <MessageCircle className={className} />;
    case 'telegram':
      return <Send className={className} />;
    case 'shop':
      return <ShoppingBag className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'booking':
      return <Calendar className={className} />;
    case 'website':
      return <Globe className={className} />;
    case 'spotify':
    case 'apple_music':
      return <Music2 className={className} />;
    case 'boomplay':
    case 'audiomack':
      return <Headphones className={className} />;
    case 'soundcloud':
      return <Radio className={className} />;
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return <LinkIcon className={className} />;
  }
}

export function VerifiedBlueTick({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} text-sky-500 shrink-0`}
      fill="currentColor"
      aria-label="Verified Pro Creator"
    >
      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
    </svg>
  );
}
