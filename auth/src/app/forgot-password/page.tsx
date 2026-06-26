import { ForgotPasswordForm } from './forgot-password-form';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { useProdUrls } = await getUrlContext();
  const redirectTo = sanitizeRedirectUrl(resolvedSearchParams.redirectTo, useProdUrls);

  return <ForgotPasswordForm redirectTo={redirectTo} />;
}
