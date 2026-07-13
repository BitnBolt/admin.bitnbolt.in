'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '../sidebar-layout';

type AdminSession = {
  id: string;
  email: string;
  admin_name: string;
};

type OrderItem = {
  productId: string;
  name?: string;
  vendorId: string;
  vendorName?: string;
  quantity: number;
  finalPrice: number;
};

type VendorSplit = {
  vendorId: string;
  shopName?: string;
  revenue: number;
};

type Order = {
  _id: string;
  orderId: string;
  status: string;
  createdAt: string;
  paymentDetails: {
    method: 'cod' | 'online';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
  };
  orderSummary: {
    totalAmount: number;
  };
  shippingAddress: {
    fullName: string;
    city: string;
    state: string;
  };
  vendorBreakdown: Record<string, VendorSplit>;
  items: OrderItem[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_FILTERS = ['all', 'paid', 'pending', 'failed', 'refunded'];

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorIdFilter = searchParams.get('vendorId') || '';
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchOrders = async (page = 1) => {
    if (!admin) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentStatus', paymentFilter);
      if (search) params.append('query', search);
      if (vendorIdFilter) params.append('vendorId', vendorIdFilter);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/orders/list?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { page, limit: pagination.limit, total: 0, pages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchOrders(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, statusFilter, paymentFilter, vendorIdFilter]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchOrders(1);
  };

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-sm text-gray-500">Monitor orders across vendors and fulfillments.</p>
            {vendorIdFilter && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm text-blue-800">
                <span>Filtered by vendor</span>
                <Link href="/orders" className="font-medium underline hover:no-underline">
                  Clear filter
                </Link>
                <Link href="/vendors" className="font-medium underline hover:no-underline">
                  Back to vendors
                </Link>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {PAYMENT_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Payments' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer name..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            Search
          </button>
        </form>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Loading orders...</div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Orders</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No orders found for the selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <Th label="Order ID" />
                        <Th label="Customer" />
                        <Th label="Vendors" />
                        <Th label="Amount" />
                        <Th label="Payment" />
                        <Th label="Status" />
                        <Th label="Date" />
                        <Th label="Actions" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => {
                        const vendorValues = Object.values(order.vendorBreakdown || {});
                        return (
                          <tr key={order._id}>
                            <Td>
                              <p className="text-sm font-semibold text-gray-900">{order.orderId}</p>
                              <p className="text-xs text-gray-400">#{order._id.slice(-6)}</p>
                            </Td>
                            <Td>
                              <p className="text-sm text-gray-900">{order.shippingAddress?.fullName}</p>
                              <p className="text-xs text-gray-400">
                                {order.shippingAddress?.city}, {order.shippingAddress?.state}
                              </p>
                            </Td>
                            <Td>
                              <div className="space-y-1 text-xs text-gray-600">
                                {vendorValues.map((vendor) => (
                                  <div key={vendor.vendorId} className="flex justify-between gap-2">
                                    <span>{vendor.shopName || vendor.vendorId.slice(-6)}</span>
                                    <span className="font-semibold text-gray-900">
                                      {currencyFormatter.format(vendor.revenue)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </Td>
                            <Td>
                              <p className="text-sm font-semibold text-gray-900">
                                {currencyFormatter.format(order.orderSummary.totalAmount)}
                              </p>
                            </Td>
                            <Td>
                              <span className="text-xs uppercase tracking-wide text-gray-500">
                                {order.paymentDetails.method.toUpperCase()} • {order.paymentDetails.status}
                              </span>
                            </Td>
                            <Td>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass(order.status)}`}>
                                {order.status}
                              </span>
                            </Td>
                            <Td>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </Td>
                            <Td>
                              <button className="text-red-600 hover:text-red-900 text-sm font-medium">View</button>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <PaginationControls pagination={pagination} onPageChange={fetchOrders} />
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function Th({ label }: { label: string }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{children}</td>;
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  if (pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing {(pagination.page - 1) * pagination.limit + 1}–
        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page === 1}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(pagination.pages, pagination.page + 1))}
          disabled={pagination.page === pagination.pages}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function statusClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}