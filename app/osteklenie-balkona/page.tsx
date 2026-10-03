import { ServicePageView, serviceMetadata } from '@/components/ServicePageView';

/** Страница под запрос «остекление балкона Астана». Контент — в content/services.ts. */
export const metadata = serviceMetadata('/osteklenie-balkona');

export default function Page() {
  return <ServicePageView slug="/osteklenie-balkona" />;
}
