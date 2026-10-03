import type { Metadata } from 'next';

import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

export const metadata: Metadata = serviceMetadata('/plastikovye-okna');

export default function Page() {
  return <ServicePageView slug="/plastikovye-okna" />;
}
