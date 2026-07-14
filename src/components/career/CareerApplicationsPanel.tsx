'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Admin {
  id: string;
  role: string;
  permissions: string[];
}

interface Application {
  _id: string;
  jobId:
    | string
    | {
        _id: string;
        title?: string;
        slug?: string;
        type?: string;
        category?: string;
      };
  jobTitle: string;
  jobSlug?: string;
  fullName: string;
  email: string;
  phone: string;
  college?: string;
  degree?: string;
  graduationYear?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  preferredTrack?: string;
  coverLetter?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  status: string;
  adminNotes?: string;
  source?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'interview', label: 'Interview' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function statusClass(status: string) {
  switch (status) {
    case 'offered':
      return 'bg-green-100 text-green-800';
    case 'interview':
      return 'bg-blue-100 text-blue-800';
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
    case 'withdrawn':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export type ApplicationScope = 'internship' | 'cap';

export function CareerApplicationsPanel({ scope }: { scope: ApplicationScope }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('jobId') || '';

  const isCap = scope === 'cap';
  const listPath = isCap ? '/career/cap-applications' : '/career/applications';

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [statusEdit, setStatusEdit] = useState('submitted');
  const [notesEdit, setNotesEdit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => {
    if (!admin) return false;
    return admin.role === 'super_admin' || admin.permissions?.includes('manage_careers');
  }, [admin]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/auth/signin');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem('adminToken');
        router.push('/auth/signin');
        return;
      }
      const data = await res.json();
      setAdmin(data.data.admin);
    } catch {
      router.push('/auth/signin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchApps = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        scope,
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (jobIdParam && !isCap) params.set('jobId', jobIdParam);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/applications/list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications(data.data.applications);
        setStats(data.data.stats || {});
        setPages(data.data.pagination.pages);
        setError(null);
      } else {
        setError(data.message || 'Failed to load applications');
      }
    } catch {
      setError('Failed to load applications');
    } finally {
      setLoadingList(false);
    }
  }, [page, statusFilter, searchTerm, jobIdParam, scope, isCap]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (admin && canManage) fetchApps();
  }, [admin, canManage, fetchApps]);

  const openDetail = (app: Application) => {
    setSelected(app);
    setStatusEdit(app.status);
    setNotesEdit(app.adminNotes || '');
    setError(null);
  };

  const saveApplication = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/applications/${selected._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusEdit,
            adminNotes: notesEdit,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update');
        return;
      }
      setSelected(null);
      fetchApps();
    } catch {
      setError('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Career · {isCap ? 'CAP Applications' : 'Internship Applications'}
        </h2>
        <p className="text-gray-500">
          Needs <code className="bg-gray-100 px-1 rounded text-sm">manage_careers</code> or super
          admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCap ? 'CAP Applications' : 'Internship Applications'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isCap
            ? 'Review Career Accelerator Program applicants. CAP page content is fixed on career.bitnbolt.in.'
            : 'Review internship / trainee applicants from the career portal.'}
          {jobIdParam && !isCap ? ' (filtered by job)' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: 'total', label: 'Total' },
          { key: 'submitted', label: 'Submitted' },
          { key: 'under_review', label: 'Review' },
          { key: 'interview', label: 'Interview' },
          { key: 'offered', label: 'Offered' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'withdrawn', label: 'Withdrawn' },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{stats[s.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email…"
            className="rounded-lg border border-gray-200 px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2 flex-wrap">
            {jobIdParam && !isCap && (
              <button
                onClick={() => router.push(listPath)}
                className="px-3 py-2 text-sm border rounded-lg text-gray-600"
              >
                Clear job filter
              </button>
            )}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingList ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No applications found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {isCap ? 'Program' : 'Role'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applied
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{app.fullName}</p>
                      <p className="text-xs text-gray-500">{app.email}</p>
                      <p className="text-xs text-gray-400">{app.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-800">{app.jobTitle}</p>
                      {app.preferredTrack && (
                        <p className="text-xs text-gray-500">{app.preferredTrack}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(app.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass(app.status)}`}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === app.status)?.label || app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(app)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-4 py-3 border-t flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-4 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selected.fullName}</h3>
              <p className="text-sm text-gray-500">{selected.jobTitle}</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1.5">
              <p>
                <span className="text-gray-500">Email:</span> {selected.email}
              </p>
              <p>
                <span className="text-gray-500">Phone:</span> {selected.phone}
              </p>
              {selected.college && (
                <p>
                  <span className="text-gray-500">College:</span> {selected.college}
                  {selected.degree ? ` · ${selected.degree}` : ''}
                  {selected.graduationYear ? ` · ${selected.graduationYear}` : ''}
                </p>
              )}
              {selected.linkedin && (
                <p>
                  <span className="text-gray-500">LinkedIn:</span>{' '}
                  <a
                    href={selected.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600"
                  >
                    {selected.linkedin}
                  </a>
                </p>
              )}
              {selected.github && (
                <p>
                  <span className="text-gray-500">GitHub:</span>{' '}
                  <a
                    href={selected.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600"
                  >
                    {selected.github}
                  </a>
                </p>
              )}
              {selected.portfolio && (
                <p>
                  <span className="text-gray-500">Portfolio:</span>{' '}
                  <a
                    href={selected.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600"
                  >
                    {selected.portfolio}
                  </a>
                </p>
              )}
              {selected.resumeUrl && (
                <p>
                  <span className="text-gray-500">Resume:</span>{' '}
                  <a
                    href={selected.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600"
                  >
                    {selected.resumeFileName || 'Open'}
                  </a>
                </p>
              )}
              {selected.coverLetter && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-gray-500 mb-1">Cover note</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{selected.coverLetter}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusEdit}
                onChange={(e) => setStatusEdit(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
              <textarea
                rows={3}
                value={notesEdit}
                onChange={(e) => setNotesEdit(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Internal notes…"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border rounded-lg"
                disabled={saving}
              >
                Close
              </button>
              <button
                onClick={saveApplication}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
