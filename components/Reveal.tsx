/**
 * Микроанимация появления (раздел 16.5): сдвиг 8px + fade, 200–300ms,
 * срабатывает один раз при входе в вьюпорт.
 *
 * Реализовано БЕЗ JavaScript — через CSS `animation-timeline: view()`.
 * Причины:
 *  1. не создаёт клиентскую границу на каждой секции (меньше работы главного
 *     потока при гидратации, лучше LCP);
 *  2. контент виден по умолчанию: браузеры без поддержки view-timeline
 *     показывают блок сразу, без «пустых» секций;
 *  3. `prefers-reduced-motion` полностью отключает анимацию (см. globals.css).
 */
export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  delay?: number;
}) {
  return (
    <Tag className={`reveal ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
