/**
 * Реестр утверждений: резолвер для публичных страниц (master prompt §3).
 *
 * Публичный сайт читает только `confirmed`. Логика такая:
 *   • утверждение подтверждено → показываем `textRu`;
 *   • не подтверждено → показываем нейтральный `fallbackRu`;
 *   • не подтверждено и fallbackRu === null → блок не рендерим вовсе.
 *
 * Значения из таблицы `claims` перекрывают статические значения из
 * content/claims.ts. Именно поэтому владелец может подтвердить утверждение в
 * админке и увидеть его на сайте без пересборки и без деплоя.
 */

import { cache } from 'react';
import { CLAIMS, type Claim, type ClaimStatus } from '@/content/claims';
import { getStore } from '@/lib/db';

export interface ResolvedClaim extends Claim {
  /** Готовый текст для страницы; null — блок нужно скрыть. */
  effectiveText: string | null;
  confirmed: boolean;
}

const claimCache = cache(async (): Promise<Record<string, ResolvedClaim>> => {
  const store = getStore();
  let overrides: Record<string, { text_ru: string; status: ClaimStatus }> = {};
  try {
    const rows = await store.listClaims();
    overrides = Object.fromEntries(rows.map((row) => [row.key, { text_ru: row.text_ru, status: row.status }]));
  } catch {
    // Хранилище недоступно — публичные страницы не должны падать из-за этого.
    overrides = {};
  }

  const resolved: Record<string, ResolvedClaim> = {};
  for (const claim of CLAIMS) {
    const override = overrides[claim.key];
    const confirmed = (override?.status ?? claim.status) === 'confirmed';
    const textRu = override?.text_ru || claim.textRu;
    resolved[claim.key] = {
      ...claim,
      status: confirmed ? 'confirmed' : 'unconfirmed',
      textRu,
      confirmed,
      effectiveText: confirmed ? textRu || claim.fallbackRu : claim.fallbackRu,
    };
  }
  return resolved;
});

export async function getClaims(): Promise<Record<string, ResolvedClaim>> {
  return claimCache();
}

/** Текст утверждения с учётом подтверждения; null — блок скрыт. */
export async function claimText(key: string): Promise<string | null> {
  const claims = await getClaims();
  return claims[key]?.effectiveText ?? null;
}

export async function isClaimConfirmed(key: string): Promise<boolean> {
  const claims = await getClaims();
  return claims[key]?.confirmed ?? false;
}

/** Для админского чек-листа: полный список с исходными статусами. */
export async function getClaimChecklist(): Promise<ResolvedClaim[]> {
  const claims = await getClaims();
  return CLAIMS.map((claim) => claims[claim.key]);
}
