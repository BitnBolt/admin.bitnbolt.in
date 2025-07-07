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

export default function PaymentsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <div className="flex space-x-2">
            <select className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400">
              <option>All Payments</option>
              <option>Successful</option>
              <option>Pending</option>
              <option>Failed</option>
              <option>Refunded</option>
            </select>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">₹1,23,45,678</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Successful Payments</h3>
            <p className="text-3xl font-bold text-blue-600">8,567</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Pending Payments</h3>
            <p className="text-3xl font-bold text-yellow-600">234</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Failed Payments</h3>
            <p className="text-3xl font-bold text-red-600">100</p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">💳</span>
              </div>
              <h4 className="font-semibold text-gray-900">Credit/Debit Cards</h4>
              <p className="text-2xl font-bold text-blue-600">45%</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">📱</span>
              </div>
              <h4 className="font-semibold text-gray-900">UPI</h4>
              <p className="text-2xl font-bold text-green-600">35%</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🏦</span>
              </div>
              <h4 className="font-semibold text-gray-900">Net Banking</h4>
              <p className="text-2xl font-bold text-purple-600">20%</p>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Payments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#TXN-12345</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">John Doe</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹12,999</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Credit Card</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Successful</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 15, 2024</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#TXN-12346</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Jane Smith</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹2,499</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">UPI</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 16, 2024</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#TXN-12347</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Mike Johnson</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹5,999</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Net Banking</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Failed</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 16, 2024</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">View</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#TXN-12348</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Sarah Wilson</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹8,999</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Credit Card</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Refunded</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 14, 2024</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-red-600 hover:text-red-900">View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 