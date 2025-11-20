'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../sidebar-layout';

type AdminSession = {
  id: string;
  email: string;
  admin_name: string;
};

type User = {
  _id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  createdAt?: string;
};

type UserStats = {
  verified: number;
  unverified: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All users' },
  { value: 'verified', label: 'Email Verified' },
  { value: 'unverified', label: 'Email Unverified' },
];

export default function UsersPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({ verified: 0, unverified: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalUsers = useMemo(() => stats.verified + stats.unverified, [stats]);

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

  const fetchUsers = async (page = 1) => {
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
      if (search) params.append('query', search);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/users/list?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setStats(data.stats || { verified: 0, unverified: 0 });
      setPagination(data.pagination || { page, limit: pagination.limit, total: 0, pages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchUsers(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, statusFilter]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchUsers(1);
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 text-sm">Search, filter, and audit customer accounts.</p>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
            placeholder="Search by name or email..."
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
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Loading users...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard title="Total Users" value={totalUsers.toLocaleString()} tone="text-blue-600" />
              <SummaryCard title="Verified" value={stats.verified.toLocaleString()} tone="text-green-600" />
              <SummaryCard title="Unverified" value={stats.unverified.toLocaleString()} tone="text-amber-600" />
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Users</h3>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No users match this filter.</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <Th label="User" />
                          <Th label="Email" />
                          <Th label="Status" />
                          <Th label="Joined" />
                          <Th label="Actions" />
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user._id}>
                            <Td>
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700">
                                  {initials(user.name || user.email)}
                                </div>
                                <div className="ml-4">
                                  <p className="text-sm font-semibold text-gray-900">{user.name || 'User'}</p>
                                  <p className="text-xs text-gray-400">{user.phoneNumber || 'No phone'}</p>
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <span className="text-sm text-gray-600">{user.email || '—'}</span>
                            </Td>
                            <Td>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {user.emailVerified ? 'Verified' : 'Unverified'}
                              </span>
                            </Td>
                            <Td>
                              <span className="text-sm text-gray-500">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </Td>
                            <Td>
                              <div className="flex gap-3">
                                <button className="text-red-600 hover:text-red-900 text-sm font-medium">View</button>
                                <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">Edit</button>
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <PaginationControls pagination={pagination} onPageChange={fetchUsers} />
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

function Th({ label }: { label: string }) {
  return (
    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{children}</td>;
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

function initials(label?: string) {
  if (!label) return 'NA';
  return label
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

