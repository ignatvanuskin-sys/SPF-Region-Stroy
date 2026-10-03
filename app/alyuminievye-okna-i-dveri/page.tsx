import type { Metadata } from 'next';

import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

export const metadata: Metadata = serviceMetadata('/alyuminievye-okna-i-dveri');

export default function Page() {
  return <ServicePageView slug="/alyuminievye-okna-i-dveri" />;
}
