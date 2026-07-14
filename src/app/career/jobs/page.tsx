'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '../../sidebar-layout';

interface Admin {
  id: string;
  role: string;
  permissions: string[];
}

interface CareerJob {
  _id: string;
  title: string;
  slug: string;
  type: string;
  category: string;
  department: string;
  location: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  duration?: string;
  stipend?: string;
  openings?: number;
  applicationDeadline?: string;
  isPublished: boolean;
  isOpen: boolean;
  updatedAt: string;
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  closed: number;
}

const JOB_TYPES = [
  { value: 'internship', label: 'Internship' },
  { value: 'trainee', label: 'Graduate trainee' },
  { value: 'cap', label: 'CAP' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

const emptyForm = {
  title: '',
  type: 'internship',
  category: '',
  department: '',
  location: 'Bengaluru',
  description: '',
  responsibilitiesText: '',
  requirementsText: '',
  duration: '',
  stipend: '',
  openings: '',
  applicationDeadline: '',
  isPublished: false,
  isOpen: true,
};

export default function CareerJobsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0, closed: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CareerJob | null>(null);
  const [form, setForm] = useState(emptyForm);
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

  const fetchJobs = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/jobs/list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(data.data.jobs);
        setStats(data.data.stats);
        setPages(data.data.pagination.pages);
        setError(null);
      } else {
        setError(data.message || 'Failed to load jobs');
      }
    } catch {
      setError('Failed to load jobs');
    } finally {
      setLoadingList(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (admin && canManage) fetchJobs();
  }, [admin, canManage, fetchJobs]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (job: CareerJob) => {
    setEditing(job);
    setForm({
      title: job.title,
      type: job.type,
      category: job.category,
      department: job.department || '',
      location: job.location || 'Bengaluru',
      description: job.description,
      responsibilitiesText: (job.responsibilities || []).join('\n'),
      requirementsText: (job.requirements || []).join('\n'),
      duration: job.duration || '',
      stipend: job.stipend || '',
      openings: job.openings != null ? String(job.openings) : '',
      applicationDeadline: job.applicationDeadline
        ? job.applicationDeadline.slice(0, 10)
        : '',
      isPublished: job.isPublished,
      isOpen: job.isOpen,
    });
    setError(null);
    setShowForm(true);
  };

  const saveJob = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      setError('Title, category, and description are required');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      category: form.category.trim(),
      department: form.department.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      responsibilities: form.responsibilitiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      requirements: form.requirementsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      duration: form.duration.trim() || undefined,
      stipend: form.stipend.trim() || undefined,
      openings: form.openings ? Number(form.openings) : undefined,
      applicationDeadline: form.applicationDeadline || undefined,
      isPublished: form.isPublished,
      isOpen: form.isOpen,
    };

    try {
      const token = localStorage.getItem('adminToken');
      const url = editing
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/jobs/${editing._id}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/jobs/create`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save job');
        return;
      }
      setShowForm(false);
      fetchJobs();
    } catch {
      setError('Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (job: CareerJob) => {
    if (!confirm(`Delete “${job.title}”? Applications will remain but lose the live role.`)) return;
    const token = localStorage.getItem('adminToken');
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/career/jobs/${job._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchJobs();
  };

  const statusBadge = (job: CareerJob) => {
    if (!job.isOpen) {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Closed</span>;
    }
    if (job.isPublished) {
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Published</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>;
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </SidebarLayout>
    );
  }

  if (!canManage) {
    return (
      <SidebarLayout>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Career · Job postings</h2>
          <p className="text-gray-500">
            Needs <code className="bg-gray-100 px-1 rounded text-sm">manage_careers</code> or super admin.
          </p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job postings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Publish roles for{' '}
              <a
                href="https://career.bitnbolt.in"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 hover:underline"
              >
                career.bitnbolt.in
              </a>
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
          >
            + New posting
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Live', value: stats.published },
            { label: 'Draft', value: stats.draft },
            { label: 'Closed', value: stats.closed },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
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
              placeholder="Search jobs..."
              className="rounded-lg border border-gray-200 px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loadingList ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No job postings yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500">
                          {job.category}
                          {job.department ? ` · ${job.department}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{job.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm">{job.location}</td>
                      <td className="px-4 py-3">{statusBadge(job)}</td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        <Link
                          href={`/career/applications?jobId=${job._id}`}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                        >
                          Apps
                        </Link>
                        <button onClick={() => openEdit(job)} className="text-blue-600 hover:text-blue-900 mr-3">
                          Edit
                        </button>
                        <button onClick={() => deleteJob(job)} className="text-red-600 hover:text-red-900">
                          Delete
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
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 p-6 space-y-4">
            <h3 className="text-lg font-semibold">{editing ? 'Edit job' : 'New job posting'}</h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category / track *</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Embedded Systems"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="e.g. 3–6 months"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stipend / salary</label>
                <input
                  value={form.stipend}
                  onChange={(e) => setForm({ ...form, stipend: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Openings</label>
                <input
                  type="number"
                  min={0}
                  value={form.openings}
                  onChange={(e) => setForm({ ...form, openings: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsibilities (one per line)
                </label>
                <textarea
                  rows={4}
                  value={form.responsibilitiesText}
                  onChange={(e) => setForm({ ...form, responsibilitiesText: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements (one per line)
                </label>
                <textarea
                  rows={4}
                  value={form.requirementsText}
                  onChange={(e) => setForm({ ...form, requirementsText: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Published (visible on career site)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                />
                Accepting applications
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveJob}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
