import { CATEGORIES } from '../components/QuickAddPanel';

const emojiMap: Record<string, string> = {};
for (const cat of CATEGORIES) {
  for (const item of cat.items) {
    emojiMap[item.name.toLowerCase()] = item.emoji;
  }
}

export function getItemEmoji(name: string): string {
  return emojiMap[name.toLowerCase()] ?? '🛒';
}
