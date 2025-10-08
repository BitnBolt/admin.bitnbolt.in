'use client'
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Razorpay configuration removed - using environment variables
  
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session && session.user.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Load existing configurations
  useEffect(() => {
    if (session?.user?.id && session.user.role === 'admin') {
      loadConfigurations();
    }
  }, [session]);

  const loadConfigurations = async () => {
    try {
      // Razorpay configuration is now handled via environment variables
      console.log('Razorpay configuration is managed via environment variables');
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  };

  // Razorpay configuration removed - using environment variables


  if (status === 'loading') {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <div className="max-w-2xl">
        {/* Razorpay Configuration */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Razorpay Configuration</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Razorpay is configured using environment variables. 
              Please set the following environment variables in your deployment:
            </p>
            <ul className="mt-2 text-blue-700 text-sm list-disc list-inside space-y-1">
              <li><code>RAZORPAY_KEY_ID</code> - Your Razorpay Key ID (starts with rzp_test_ or rzp_live_)</li>
              <li><code>RAZORPAY_KEY_SECRET</code> - Your Razorpay Key Secret</li>
            </ul>
            <p className="mt-3 text-blue-800 text-sm">
              <strong>All payments will be processed through your single Razorpay account and credited directly to your account.</strong>
            </p>
          </div>
        </div>

        {/* Shiprocket Information */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Shiprocket Configuration</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Shiprocket is configured using environment variables. 
              Please set the following environment variables in your deployment:
            </p>
            <ul className="mt-2 text-blue-700 text-sm list-disc list-inside space-y-1">
              <li><code>SHIPROCKET_EMAIL</code> - Your Shiprocket account email</li>
              <li><code>SHIPROCKET_PASSWORD</code> - Your Shiprocket account password</li>
              <li><code>SHIPROCKET_PICKUP_NAME</code> - Pickup location name</li>
              <li><code>SHIPROCKET_PICKUP_PHONE</code> - Pickup location phone</li>
              <li><code>SHIPROCKET_PICKUP_ADDRESS</code> - Pickup location address</li>
              <li><code>SHIPROCKET_PICKUP_CITY</code> - Pickup location city</li>
              <li><code>SHIPROCKET_PICKUP_STATE</code> - Pickup location state</li>
              <li><code>SHIPROCKET_PICKUP_PINCODE</code> - Pickup location pincode</li>
              <li><code>SHIPROCKET_PICKUP_COUNTRY</code> - Pickup location country (default: India)</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
  );
} 