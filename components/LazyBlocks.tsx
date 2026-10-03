'use client';

import dynamic from 'next/dynamic';

/**
 * Тяжёлые клиентские блоки подгружаются отдельными чанками, чтобы стартовый
 * JS страницы оставался в пределах лимита ≤ 120 КБ gzip (раздел 17).
 * SSR не отключаем: разметка приходит с сервера, индексируется и не даёт
 * сдвига контента.
 */

export const LazyLeadForm = dynamic(
  () => import('@/components/LeadForm').then((m) => m.LeadForm),
  {
    // Заглушка без id: якорь #zayavka стоит на серверной обёртке страницы,
    // поэтому в разметке никогда нет двух элементов с одним id.
    loading: () => (
      <div className="card min-h-[280px] p-5 text-[15px] text-[color:var(--muted)] md:p-8" aria-busy="true">
        Загружаем форму…
      </div>
    ),
  },
);

export const LazyPortfolioSection = dynamic(
  () => import('@/components/sections/PortfolioSection').then((m) => m.PortfolioSection),
  { loading: () => null },
);
