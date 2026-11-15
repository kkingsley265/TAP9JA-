import heroAvatar from '../assets/images/creator_hero_avatar_1794688464502.jpg';
import fashionAvatar from '../assets/images/creator_fashion_avatar_1794688465819.jpg';
import techAvatar from '../assets/images/creator_tech_avatar_1794688466230.jpg';

export const DEMO_AVATARS = {
  hero: heroAvatar,
  fashion: fashionAvatar,
  tech: techAvatar,
} as const;

export function resolveAvatarUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  if (rawUrl === 'demo:hero') return heroAvatar;
  if (rawUrl === 'demo:fashion') return fashionAvatar;
  if (rawUrl === 'demo:tech') return techAvatar;
  return rawUrl;
}
