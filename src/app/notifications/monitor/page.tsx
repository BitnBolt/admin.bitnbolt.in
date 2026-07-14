'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../../sidebar-layout';

type Admin = {
  id: string;
  role: string;
  permissions: string[];
};

type Domain = {
  id: string;
  label: string;
  group: string;
  description: string;
};

type NotificationLog = {
  _id: string;
  domain: string;
  event: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  botName?: string;
  chatId?: string;
  chatLabel?: string;
  error?: string;
  createdAt: string;
};

const STATUS_CLASS: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
};

const SEVERITY_CLASS: Record<string, string> = {
  info: 'text-blue-700',
  warning: 'text-amber-700',
  error: 'text-red-700',
  critical: 'text-red-900 font-semibold',
};

function canManage(admin: Admin | null) {
  if (!admin) return false;
  return (
    admin.role === 'super_admin' ||
    admin.permissions?.includes('manage_notifications') ||
    admin.permissions?.includes('manage_settings')
  );
}

export default function NotificationMonitorPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testDomain, setTestDomain] = useState('system');
  const [testing, setTesting] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  const loadLogs = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || !backend) return;

    const params = new URLSearchParams({ limit: '50', page: '1' });
    if (domainFilter) params.set('domain', domainFilter);
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`${backend}/api/admin/notifications/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || 'Failed to load logs');
      return;
    }
    setLogs(data.data.logs || []);
    if (data.data.domains?.length) setDomains(data.data.domains);
    setError('');
  }, [backend, domainFilter, statusFilter]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/auth/signin');
      return;
    }

    (async () => {
      try {
        const sessionRes = await fetch(`${backend}/api/admin/session`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sessionRes.ok) {
          localStorage.removeItem('adminToken');
          router.push('/auth/signin');
          return;
        }
        const session = await sessionRes.json();
        setAdmin(session.data.admin);
        if (
          session.data.admin.role === 'super_admin' ||
          session.data.admin.permissions?.includes('manage_notifications') ||
          session.data.admin.permissions?.includes('manage_settings')
        ) {
          await loadLogs();
        }
      } catch {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [backend, loadLogs, router]);

  useEffect(() => {
    if (!canManage(admin)) return;
    void loadLogs();
  }, [admin, domainFilter, statusFilter, loadLogs]);

  useEffect(() => {
    if (!canManage(admin) || !backend) return;

    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const es = new EventSource(
      `${backend}/api/admin/notifications/stream?token=${encodeURIComponent(token)}`
    );
    esRef.current = es;

    es.addEventListener('connected', () => setLive(true));
    es.addEventListener('notification', (evt) => {
      try {
        const log = JSON.parse((evt as MessageEvent).data) as NotificationLog;
        if (domainFilter && log.domain !== domainFilter) return;
        if (statusFilter && log.status !== statusFilter) return;
        setLogs((prev) => [log, ...prev].slice(0, 100));
      } catch {
        /* ignore malformed */
      }
    });
    es.onerror = () => {
      setLive(false);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
      setLive(false);
    };
  }, [admin, backend, domainFilter, statusFilter]);

  const sendTest = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || !backend) return;
    setTesting(true);
    try {
      const res = await fetch(`${backend}/api/admin/notifications/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: testDomain }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Test failed');
      }
    } catch {
      setError('Test request failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </SidebarLayout>
    );
  }

  if (!canManage(admin)) {
    return (
      <SidebarLayout>
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold text-gray-900">Live monitor</h1>
          <p className="mt-2 text-sm text-gray-600">
            Needs <code className="bg-gray-100 px-1 rounded">manage_notifications</code> (or
            settings / super admin).
          </p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification monitor</h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time Telegram delivery log across all domains.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                live ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
              />
              {live ? 'Live' : 'Disconnected'}
            </span>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Domain</span>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Send test</span>
              <div className="mt-1 flex gap-2">
                <select
                  value={testDomain}
                  onChange={(e) => setTestDomain(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                >
                  {(domains.length
                    ? domains
                    : [{ id: 'system', label: 'System' }]
                  ).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={testing}
                  onClick={() => void sendTest()}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {testing ? '…' : 'Test'}
                </button>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Domain</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      No notifications yet. Configure a bot + chat scopes, then send a test.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {domains.find((d) => d.id === log.domain)?.label || log.domain}
                        </div>
                        <div className="text-xs text-gray-500">{log.event}</div>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className={`${SEVERITY_CLASS[log.severity] || ''} font-medium`}>
                          {log.title}
                        </div>
                        <div className="text-gray-600 mt-0.5 line-clamp-2">{log.body}</div>
                        {log.error && (
                          <div className="text-red-600 text-xs mt-1">{log.error}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.botName || log.chatLabel ? (
                          <>
                            <div>{log.botName || '—'}</div>
                            <div className="text-xs">{log.chatLabel || log.chatId}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_CLASS[log.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
