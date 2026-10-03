import type { Metadata } from 'next';

import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

export const metadata: Metadata = serviceMetadata('/dveri');

export default function Page() {
  return <ServicePageView slug="/dveri" />;
}
