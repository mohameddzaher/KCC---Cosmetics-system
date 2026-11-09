import { HERO_PRODUCT_IMAGE, HERO_PRODUCT_RATIO } from '@/lib/heroProduct';

/**
 * Where the travelling product lands in a section.
 *
 * An invisible box: its position and size are where, and how large, the
 * product sits once it arrives. The travelling layer measures these boxes; it
 * never reads layout while the page scrolls. The image inside is the still
 * fallback, shown only when the product does not travel (reduced motion, a
 * phone, or before the script has loaded nothing is shown at all).
 *
 * `mobile` keeps the slot, and its still image, on phones.
 */
export default function ProductSlot({
  name,
  className = '',
  mobile = false,
}: {
  name: string;
  className?: string;
  mobile?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-product-slot={name}
      data-product-mobile={mobile ? '1' : undefined}
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ aspectRatio: String(HERO_PRODUCT_RATIO) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO_PRODUCT_IMAGE} alt="" className="product-static-img h-full w-full object-contain drop-shadow-xl" loading="lazy" decoding="async" />
    </div>
  );
}
