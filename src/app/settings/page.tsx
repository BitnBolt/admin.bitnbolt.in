'use client'
export const dynamic = "force-dynamic";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const sessionResp = useSession();
  const session = sessionResp?.data;
  const status = sessionResp?.status;
  const router = useRouter();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session && (session.user as { role?: string })?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session || !(session.user as { role?: string }) || (session.user as { role?: string })?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Cashfree Configuration</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Cashfree is configured using environment variables on the main storefront (
              <code className="text-xs">bitnbolt.in</code>).
              <br />
              Required: <code className="text-xs">CASHFREE_CLIENT_ID</code>,{' '}
              <code className="text-xs">CASHFREE_CLIENT_SECRET</code>,{' '}
              <code className="text-xs">CASHFREE_WEBHOOK_SECRET</code>,{' '}
              <code className="text-xs">CASHFREE_ENV</code> (<code className="text-xs">sandbox</code> or{' '}
              <code className="text-xs">production</code>),{' '}
              <code className="text-xs">NEXT_PUBLIC_CASHFREE_MODE</code>, and{' '}
              <code className="text-xs">NEXT_PUBLIC_APP_URL=https://bitnbolt.in</code>.
              <br />
              Webhook endpoint: <code className="text-xs">/api/payment/webhook/cashfree</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
