'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../sidebar-layout';

type AdminSession = {
  id: string;
  email: string;
  admin_name: string;
};

type Summary = {
  totalOrders: number;
  totalRevenue: number;
  totalVendors: number;
  totalProducts: number;
  totalUsers: number;
};

type StatusBreakdown = Record<string, { orders: number; revenue: number }>;

type TrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

type TopVendor = {
  vendorId: string;
  shopName?: string;
  email?: string;
  revenue: number;
  orders: number;
};

type TopProduct = {
  productId: string;
  name?: string;
  revenue: number;
  unitsSold: number;
};

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last 12 months' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary>({
    totalOrders: 0,
    totalRevenue: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalUsers: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({});
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/auth/signin');
        return;
      }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem('adminToken');
          router.push('/auth/signin');
          return;
        }

        const data = await response.json();
        setAdmin(data.data.admin);
      } catch (err) {
        console.error('Admin session check failed', err);
        localStorage.removeItem('adminToken');
        router.push('/auth/signin');
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!admin) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/analytics/summary?range=${range}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setSummary(data.summary);
        setStatusBreakdown(data.statusBreakdown || {});
        setRevenueTrend(data.revenueTrend || []);
        setTopVendors(data.topVendors || []);
        setTopProducts(data.topProducts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [admin, range]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm">Live KPIs across orders, vendors, and revenue</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Loading analytics...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <SummaryCard title="Total Revenue" value={currencyFormatter.format(summary.totalRevenue)} tone="text-green-600" />
              <SummaryCard title="Orders" value={summary.totalOrders.toLocaleString()} tone="text-blue-600" />
              <SummaryCard title="Vendors" value={summary.totalVendors.toLocaleString()} tone="text-indigo-600" />
              <SummaryCard title="Products" value={summary.totalProducts.toLocaleString()} tone="text-purple-600" />
              <SummaryCard title="Users" value={summary.totalUsers.toLocaleString()} tone="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <TrendChart data={revenueTrend} currencyFormatter={currencyFormatter} />
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
                <div className="space-y-4">
                  {Object.keys(statusBreakdown).length === 0 && (
                    <p className="text-sm text-gray-500">No orders for selected range.</p>
                  )}
                  {Object.entries(statusBreakdown).map(([statusKey, stats]) => (
                    <div key={statusKey}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span className="capitalize">{statusKey}</span>
                        <span>{stats.orders} orders</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                          style={{
                            width: `${
                              summary.totalOrders === 0 ? 0 : Math.min((stats.orders / summary.totalOrders) * 100, 100)
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {currencyFormatter.format(stats.revenue)} collected
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Vendors</h3>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {topVendors.length} vendors
                  </span>
                </div>
                {topVendors.length === 0 ? (
                  <p className="text-sm text-gray-500">No vendor activity in this range.</p>
                ) : (
                  <div className="space-y-3">
                    {topVendors.map((vendor) => (
                      <div key={vendor.vendorId} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{vendor.shopName || 'Vendor'}</p>
                          <p className="text-xs text-gray-400">{vendor.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">
                            {currencyFormatter.format(vendor.revenue)}
                          </p>
                          <p className="text-xs text-gray-400">{vendor.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">{topProducts.length} items</span>
                </div>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No product sales recorded for this range.</p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((product) => (
                      <div key={product.productId} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{product.name || 'Product'}</p>
                          <p className="text-xs text-gray-400">{product.unitsSold} units sold</p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600">
                          {currencyFormatter.format(product.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: string; tone: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs uppercase text-gray-400 tracking-wide">{title}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function TrendChart({ data, currencyFormatter }: { data: TrendPoint[]; currencyFormatter: Intl.NumberFormat }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No data available.</p>;
  }

  const maxRevenue = Math.max(...data.map((point) => point.revenue));

  return (
    <div className="space-y-3">
      {data.map((point) => (
        <div key={point.date} className="flex items-center gap-3">
          <span className="w-20 text-xs font-medium text-gray-500">{point.date}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
              style={{
                width: `${maxRevenue === 0 ? 0 : Math.max((point.revenue / maxRevenue) * 100, 6)}%`,
              }}
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{currencyFormatter.format(point.revenue)}</p>
            <p className="text-xs text-gray-400">{point.orders} orders</p>
          </div>
        </div>
      ))}
    </div>
  );
}