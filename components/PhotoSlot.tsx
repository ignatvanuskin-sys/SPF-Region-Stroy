import Image from 'next/image';

import { ILLUSTRATIONS, type IllustrationProps } from '@/components/illustrations';
import { ILLUSTRATION_CAPTION, type PhotoSlotDefinition } from '@/content/media';

/**
 * Фото-слот (раздел 16.6).
 * Пока src === null, рисуется SVG-иллюстрация и честная подпись.
 * Когда придут реальные фото — next/image с тем же alt, что описывает объект.
 */
export function PhotoSlot({
  slot,
  ratio = '3:2',
  className = '',
  caption = true,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: {
  slot: PhotoSlotDefinition;
  ratio?: IllustrationProps['ratio'];
  className?: string;
  caption?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const Illustration = ILLUSTRATIONS[slot.fallback];

  if (slot.src) {
    const dims =
      ratio === '16:9'
        ? { width: 1600, height: 900 }
        : ratio === '4:5'
          ? { width: 800, height: 1000 }
          : { width: 1200, height: 800 };
    return (
      <figure className={className}>
        <Image
          src={slot.src}
          alt={slot.alt}
          width={dims.width}
          height={dims.height}
          sizes={sizes}
          priority={priority}
          className="h-auto w-full rounded-[10px] border border-[color:var(--line)] object-cover"
        />
        {caption && <figcaption className="mt-2 text-[13px] text-[color:var(--muted)]">{slot.alt}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div className="rounded-[10px] border border-[color:var(--line)] bg-[color:var(--bg-alt)] p-4 md:p-6">
        <Illustration ratio={ratio} />
      </div>
      {caption && (
        <figcaption className="mt-2 text-[13px] text-[color:var(--muted)]">
          {ILLUSTRATION_CAPTION}
        </figcaption>
      )}
    </figure>
  );
}
