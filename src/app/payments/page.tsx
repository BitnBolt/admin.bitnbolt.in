'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../sidebar-layout';

type AdminSession = {
  id: string;
  email: string;
  admin_name: string;
};

type PaymentSummary = {
  totalRevenue: number;
  successful: number;
  pending: number;
  failed: number;
  refunded: number;
  cod: number;
  prepaid: number;
};

type PaymentRow = {
  orderId: string;
  status: string;
  paymentDetails: {
    method: 'cod' | 'online';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
  };
  orderSummary: {
    totalAmount: number;
  };
  createdAt: string;
  updatedAt: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalRevenue: 0,
    successful: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
    cod: 0,
    prepaid: 0,
  });
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [filter, setFilter] = useState('all');
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

  useEffect(() => {
    const fetchPayments = async () => {
      if (!admin) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/payments/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }
        const data = await response.json();
        setSummary(data.summary || summary);
        setPayments(data.latestPayments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payments data');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'all') return true;
    if (filter === 'successful') return payment.paymentDetails.status === 'paid';
    if (filter === 'pending') return payment.paymentDetails.status === 'pending';
    if (filter === 'failed') return payment.paymentDetails.status === 'failed';
    if (filter === 'refunded') return payment.paymentDetails.status === 'refunded';
    return true;
  });

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-500 text-sm">Track platform revenue and settlement health.</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="all">All Payments</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Loading payments...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard title="Total Revenue" value={currencyFormatter.format(summary.totalRevenue)} tone="text-green-600" />
              <SummaryCard title="Successful" value={currencyFormatter.format(summary.successful)} tone="text-blue-600" />
              <SummaryCard title="Pending" value={currencyFormatter.format(summary.pending)} tone="text-yellow-600" />
              <SummaryCard title="Refunded" value={currencyFormatter.format(summary.refunded)} tone="text-gray-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mix</h3>
                <MixRow label="Prepaid" amount={summary.prepaid} total={summary.totalRevenue} color="bg-green-500" currencyFormatter={currencyFormatter} />
                <MixRow label="Cash on Delivery" amount={summary.cod} total={summary.totalRevenue} color="bg-indigo-500" currencyFormatter={currencyFormatter} />
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Snapshot</h3>
                <div className="grid grid-cols-2 gap-4">
                  <HealthCard label="Success %" value={percentage(summary.successful, summary.totalRevenue)} helper="Successful / Total revenue" />
                  <HealthCard label="Pending %" value={percentage(summary.pending, summary.totalRevenue)} helper="Pending / Total revenue" />
                  <HealthCard label="Failure %" value={percentage(summary.failed, summary.totalRevenue)} helper="Failed / Total revenue" />
                  <HealthCard label="Refund %" value={percentage(summary.refunded, summary.totalRevenue)} helper="Refunded / Total revenue" />
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Payments</h3>
                {filteredPayments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No payments match this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <Th label="Transaction" />
                          <Th label="Amount" />
                          <Th label="Method" />
                          <Th label="Status" />
                          <Th label="Date" />
                          <Th label="Actions" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPayments.map((payment) => (
                          <tr key={payment.orderId}>
                            <Td>
                              <p className="text-sm font-semibold text-gray-900">{payment.orderId}</p>
                              <p className="text-xs text-gray-400">
                                {payment.paymentDetails.transactionId || 'No TXN ID'}
                              </p>
                            </Td>
                            <Td>
                              <p className="text-sm font-semibold text-gray-900">
                                {currencyFormatter.format(payment.orderSummary.totalAmount || 0)}
                              </p>
                            </Td>
                            <Td>
                              <span className="text-xs uppercase tracking-wide text-gray-500">
                                {payment.paymentDetails.method.toUpperCase()}
                              </span>
                            </Td>
                            <Td>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass(payment.paymentDetails.status)}`}>
                                {payment.paymentDetails.status}
                              </span>
                            </Td>
                            <Td>
                              <p className="text-sm text-gray-600">
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </p>
                            </Td>
                            <Td>
                              <button className="text-red-600 hover:text-red-900 text-sm font-medium">View</button>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

function MixRow({
  label,
  amount,
  total,
  color,
  currencyFormatter,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
  currencyFormatter: Intl.NumberFormat;
}) {
  const pct = total === 0 ? 0 : Math.round((amount / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{label}</span>
        <span>
          {currencyFormatter.format(amount)} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HealthCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}%</p>
      <p className="text-xs text-gray-400">{helper}</p>
    </div>
  );
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Th({ label }: { label: string }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{children}</td>;
}

function statusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}