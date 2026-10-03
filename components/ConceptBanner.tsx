import { CONCEPT_BANNER_TEXT, IS_CONCEPT } from '@/content/site';

/**
 * Тонкая полоса сверху — только в режиме concept (раздел 2).
 * В production не рендерится вовсе.
 */
export function ConceptBanner() {
  if (!IS_CONCEPT) return null;
  return (
    <div
      role="note"
      className="bg-marker px-4 py-2 text-center text-[13px] leading-snug text-marker-foreground"
    >
      {CONCEPT_BANNER_TEXT}
    </div>
  );
}
