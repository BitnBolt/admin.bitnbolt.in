'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../sidebar-layout';

interface Admin {
  id: string;
  email: string;
  admin_name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.data.admin);
      } else {
        localStorage.removeItem('adminToken');
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      router.push('/auth/signin');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
            Save Changes
          </button>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    defaultValue="BitnBolt Admin Panel"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option>Indian Rupee (₹)</option>
                    <option>US Dollar ($)</option>
                    <option>Euro (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option>Asia/Kolkata (IST)</option>
                    <option>UTC</option>
                    <option>America/New_York</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-xs text-gray-500">Enable 2FA for additional security</p>
                  </div>
                  <button className="bg-gray-200 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                    <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                    <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <select className="rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Login Attempts</h4>
                    <p className="text-xs text-gray-500">Max failed login attempts</p>
                  </div>
                  <input
                    type="number"
                    defaultValue="5"
                    className="w-20 rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New User Registration</h4>
                    <p className="text-xs text-gray-500">Get notified when new users register</p>
                  </div>
                  <button className="bg-red-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New Vendor Registration</h4>
                    <p className="text-xs text-gray-500">Get notified when new vendors register</p>
                  </div>
                  <button className="bg-red-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Order Notifications</h4>
                    <p className="text-xs text-gray-500">Get notified about new orders</p>
                  </div>
                  <button className="bg-red-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Platform Version</h4>
                  <p className="mt-1 text-sm text-gray-900">v1.0.0</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Database</h4>
                  <p className="mt-1 text-sm text-gray-900">MongoDB v6.0</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Last Backup</h4>
                  <p className="mt-1 text-sm text-gray-900">Dec 16, 2024 10:30 AM</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Server Status</h4>
                  <p className="mt-1 text-sm text-green-600">✓ Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 