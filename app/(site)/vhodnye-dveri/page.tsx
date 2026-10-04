import type { Metadata } from 'next';
import { ServicePageView } from '@/components/site/service-page-view';
import { SERVICE_BY_SLUG } from '@/content/services';

const service = SERVICE_BY_SLUG['vhodnye-dveri'];

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: { canonical: `/${service.slug}` },
};

export default function Page() {
  return <ServicePageView service={service} />;
}
