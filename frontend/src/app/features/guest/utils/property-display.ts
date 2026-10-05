import { Photo } from '@api/dto';

/** Icon per property type code; unknown types get a house. */
const TYPE_ICONS: Record<string, string> = {
  APARTMENT: 'building',
  STUDIO: 'building',
  HOTEL: 'hotel',
  HOTEL_APARTMENT: 'hotel',
  VILLA: 'castle',
  CHALET: 'trees',
  FARM: 'trees',
};

export function propertyTypeIcon(code: string): string {
  return TYPE_ICONS[code.toUpperCase()] ?? 'home';
}

/** Cover photo URL of a listing: the explicit cover, else the first photo. */
export function coverOf(item: { coverUrl?: string | null; photos?: readonly (Photo | string)[] }): string | null {
  const first = item.photos?.[0];
  return item.coverUrl ?? (typeof first === 'string' ? first : first?.url) ?? null;
}

/** `https://wa.me/<digits>` for a support number such as `+966 50 000 0000`. */
export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  const digits = number?.replace(/\D/g, '');
  if (!digits) return null;
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

/** Google Maps link for a coordinate. */
export function mapsLink(latitude: number | null | undefined, longitude: number | null | undefined): string | null {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
