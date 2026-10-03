import { Reveal } from '@/components/Reveal';

/**
 * Секция: чередование --bg / --bg-alt, вертикальные отступы
 * 64px (моб.) и 96px (дес.). Всегда с одним <h2>.
 */
export function Section({
  id,
  title,
  lead,
  alt = false,
  children,
  className = '',
  headingLevel = 2,
}: {
  id?: string;
  title?: string;
  lead?: React.ReactNode;
  alt?: boolean;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      id={id}
      className={`py-16 md:py-24 ${alt ? 'bg-[color:var(--bg-alt)]' : ''} ${className}`}
      aria-labelledby={title && id ? `${id}-title` : undefined}
    >
      <div className="container-page">
        {(title || lead) && (
          <Reveal className="mb-8 md:mb-12">
            {title && <Heading id={id ? `${id}-title` : undefined}>{title}</Heading>}
            {lead && (
              <div className="mt-4 max-w-[68ch] text-[17px] text-[color:var(--ink-2)]">{lead}</div>
            )}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
