'use client';

import dynamic from 'next/dynamic';

/**
 * Тяжёлые клиентские блоки грузятся отдельными чанками: стартовый JS
 * страницы должен оставаться в пределах лимита. SSR не отключаем —
 * разметка приходит с сервера и не даёт сдвига контента.
 */

export const LazyQuiz = dynamic(() => import('@/components/Quiz').then((m) => m.Quiz), {
  // Заглушка без id: якорь #raschet стоит на серверной обёртке страницы,
  // поэтому двух элементов с одним id в разметке не появляется.
  loading: () => (
    <div className="min-h-[360px] border border-border bg-card p-6 text-[15px] text-muted-foreground md:p-9" aria-busy="true">
      Загружаем форму расчета…
    </div>
  ),
});

export const LazyServicesShowcase = dynamic(
  () => import('@/components/ServicesShowcase').then((m) => m.ServicesShowcase),
  { loading: () => null },
);
