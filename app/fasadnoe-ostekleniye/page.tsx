import type { Metadata } from 'next';

import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

export const metadata: Metadata = serviceMetadata('/fasadnoe-ostekleniye');

export default function Page() {
  return <ServicePageView slug="/fasadnoe-ostekleniye" />;
}
