import type { Metadata } from 'next';

import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

export const metadata: Metadata = serviceMetadata('/ustanovka-i-remont-okon');

export default function Page() {
  return <ServicePageView slug="/ustanovka-i-remont-okon" />;
}
