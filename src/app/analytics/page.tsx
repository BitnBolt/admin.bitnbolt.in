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

export default function AnalyticsPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <div className="flex space-x-2">
            <select className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
              <option>Last Year</option>
            </select>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">₹1,23,45,678</p>
            <p className="text-sm text-green-600 mt-2">+12.5% from last month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
            <p className="text-3xl font-bold text-blue-600">8,901</p>
            <p className="text-sm text-blue-600 mt-2">+8.3% from last month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
            <p className="text-3xl font-bold text-purple-600">1,156</p>
            <p className="text-sm text-purple-600 mt-2">+15.2% from last month</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
            <p className="text-3xl font-bold text-orange-600">3.2%</p>
            <p className="text-sm text-orange-600 mt-2">+0.5% from last month</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Revenue Chart Placeholder</p>
            </div>
          </div>

          {/* Orders Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Orders Chart Placeholder</p>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Vendors */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-green-700">TS</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">TechStore</span>
                </div>
                <span className="text-sm text-gray-500">₹2,34,567</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-blue-700">FS</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">FashionStore</span>
                </div>
                <span className="text-sm text-gray-500">₹1,89,234</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-purple-700">HS</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">HomeStore</span>
                </div>
                <span className="text-sm text-gray-500">₹1,56,789</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">iPhone 15 Pro</span>
                <span className="text-sm text-gray-500">234 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Samsung Galaxy S24</span>
                <span className="text-sm text-gray-500">189 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">MacBook Air M2</span>
                <span className="text-sm text-gray-500">156 units</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Nike Air Max</span>
                <span className="text-sm text-gray-500">123 units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New vendor TechStore registered</span>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Order #12345 completed</span>
              <span className="text-xs text-gray-400">4 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New user registration: john@example.com</span>
              <span className="text-xs text-gray-400">6 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Payment received: ₹5,000</span>
              <span className="text-xs text-gray-400">8 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
} 