import Link from 'next/link';

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="container-page pt-6">
      <ol className="flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-primary">
            Главная
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-muted-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
