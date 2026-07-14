'use client';

import { useCallback, useEffect, useState } from 'react';
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

type Bot = {
  _id: string;
  name: string;
  botTokenMasked?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
};

type Chat = {
  _id: string;
  botId: string | { _id: string; name?: string; isActive?: boolean };
  chatId: string;
  label: string;
  scopes: string[];
  isActive: boolean;
};

function canManage(admin: Admin | null) {
  if (!admin) return false;
  return (
    admin.role === 'super_admin' ||
    admin.permissions?.includes('manage_notifications') ||
    admin.permissions?.includes('manage_settings')
  );
}

function botIdOf(chat: Chat): string {
  return typeof chat.botId === 'string' ? chat.botId : chat.botId?._id;
}

export default function TelegramBotsPage() {
  const router = useRouter();
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bots, setBots] = useState<Bot[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  const [botForm, setBotForm] = useState({ name: '', botToken: '', notes: '' });
  const [savingBot, setSavingBot] = useState(false);

  const [chatForm, setChatForm] = useState({
    botId: '',
    label: '',
    chatId: '',
    scopes: [] as string[],
  });
  const [savingChat, setSavingChat] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const loadAll = useCallback(async () => {
    if (!backend) return;
    const [botsRes, chatsRes, domainsRes] = await Promise.all([
      fetch(`${backend}/api/admin/notifications/bots`, { headers: authHeaders() }),
      fetch(`${backend}/api/admin/notifications/chats`, { headers: authHeaders() }),
      fetch(`${backend}/api/admin/notifications/domains`, { headers: authHeaders() }),
    ]);

    const botsData = await botsRes.json();
    const chatsData = await chatsRes.json();
    const domainsData = await domainsRes.json();

    if (!botsRes.ok || !botsData.success) {
      setError(botsData.message || 'Failed to load bots');
      return;
    }
    setBots(botsData.data.bots || []);
    setChats(chatsData.data?.chats || []);
    setDomains(domainsData.data?.domains || []);
    setError('');
  }, [authHeaders, backend]);

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
        if (canManage(session.data.admin)) {
          await loadAll();
        }
      } catch {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [backend, loadAll, router]);

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBot(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${backend}/api/admin/notifications/bots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(botForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save bot');
        return;
      }
      setMessage(data.message || 'Bot saved');
      setBotForm({ name: '', botToken: '', notes: '' });
      await loadAll();
      if (data.data?.bot?._id) setExpandedBot(data.data.bot._id);
    } catch {
      setError('Failed to save bot');
    } finally {
      setSavingBot(false);
    }
  };

  const toggleBotActive = async (bot: Bot) => {
    const res = await fetch(`${backend}/api/admin/notifications/bots/${bot._id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !bot.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || 'Update failed');
      return;
    }
    await loadAll();
  };

  const deleteBot = async (bot: Bot) => {
    if (!confirm(`Delete bot "${bot.name}" and all its chat targets?`)) return;
    const res = await fetch(`${backend}/api/admin/notifications/bots/${bot._id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || 'Delete failed');
      return;
    }
    if (expandedBot === bot._id) setExpandedBot(null);
    await loadAll();
  };

  const toggleScope = (scope: string, forBotId: string) => {
    setChatForm((prev) => {
      const base =
        prev.botId === forBotId
          ? prev
          : { ...prev, botId: forBotId, label: prev.botId === forBotId ? prev.label : prev.label };
      const scopes = base.scopes.includes(scope)
        ? base.scopes.filter((s) => s !== scope)
        : [...base.scopes, scope];
      return { ...base, botId: forBotId, scopes };
    });
  };

  const startEditChat = (chat: Chat) => {
    setEditingChatId(chat._id);
    setChatForm({
      botId: botIdOf(chat),
      label: chat.label,
      chatId: chat.chatId,
      scopes: [...(chat.scopes || [])],
    });
    setExpandedBot(botIdOf(chat));
  };

  const resetChatForm = (botId?: string) => {
    setEditingChatId(null);
    setChatForm({
      botId: botId || '',
      label: '',
      chatId: '',
      scopes: [],
    });
  };

  const saveChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatForm.botId || !chatForm.chatId.trim() || !chatForm.label.trim()) {
      setError('Chat label, chat ID, and bot are required');
      return;
    }
    setSavingChat(true);
    setError('');
    setMessage('');
    try {
      const url = editingChatId
        ? `${backend}/api/admin/notifications/chats/${editingChatId}`
        : `${backend}/api/admin/notifications/chats`;
      const res = await fetch(url, {
        method: editingChatId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          botId: chatForm.botId,
          chatId: chatForm.chatId,
          label: chatForm.label,
          scopes: chatForm.scopes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to save chat');
        return;
      }
      setMessage(data.message || 'Chat saved');
      resetChatForm(chatForm.botId);
      await loadAll();
    } catch {
      setError('Failed to save chat');
    } finally {
      setSavingChat(false);
    }
  };

  const deleteChat = async (chat: Chat) => {
    if (!confirm(`Remove chat "${chat.label}"?`)) return;
    const res = await fetch(`${backend}/api/admin/notifications/chats/${chat._id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || 'Delete failed');
      return;
    }
    if (editingChatId === chat._id) resetChatForm(botIdOf(chat));
    await loadAll();
  };

  const toggleChatActive = async (chat: Chat) => {
    const res = await fetch(`${backend}/api/admin/notifications/chats/${chat._id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !chat.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || 'Update failed');
      return;
    }
    await loadAll();
  };

  const groupedDomains = domains.reduce<Record<string, Domain[]>>((acc, d) => {
    (acc[d.group] ||= []).push(d);
    return acc;
  }, {});

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
          <h1 className="text-xl font-semibold text-gray-900">Telegram bots</h1>
          <p className="mt-2 text-sm text-gray-600">
            Needs <code className="bg-gray-100 px-1 rounded">manage_notifications</code>.
          </p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telegram bots</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add BotFather tokens, then attach chat IDs with their own domain scopes. One bot can
            fan out to many chats.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-3 py-2">
            {message}
          </div>
        )}

        <form
          onSubmit={createBot}
          className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Add chatbot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Internal name</span>
              <input
                required
                value={botForm.name}
                onChange={(e) => setBotForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ops bot"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">BotFather API token</span>
              <input
                required
                value={botForm.botToken}
                onChange={(e) => setBotForm((p) => ({ ...p, botToken: e.target.value }))}
                placeholder="123456:ABC-DEF..."
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Notes (optional)</span>
              <input
                value={botForm.notes}
                onChange={(e) => setBotForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={savingBot}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {savingBot ? 'Verifying…' : 'Save bot'}
          </button>
        </form>

        <div className="space-y-4">
          {bots.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No bots yet. Add one from BotFather to get started.
            </div>
          ) : (
            bots.map((bot) => {
              const botChats = chats.filter((c) => botIdOf(c) === bot._id);
              const open = expandedBot === bot._id;
              return (
                <div key={bot._id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedBot(open ? null : bot._id);
                        if (!open) resetChatForm(bot._id);
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-semibold text-gray-900">{bot.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        {bot.botTokenMasked} · {botChats.length} chat
                        {botChats.length === 1 ? '' : 's'}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          bot.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {bot.isActive ? 'Active' : 'Paused'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleBotActive(bot)}
                        className="text-sm px-2 py-1 border border-gray-300 rounded-md"
                      >
                        {bot.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteBot(bot)}
                        className="text-sm px-2 py-1 border border-red-200 text-red-700 rounded-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="p-4 space-y-5 bg-gray-50">
                      {bot.notes && (
                        <p className="text-sm text-gray-600">{bot.notes}</p>
                      )}

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-800">Chat targets</h3>
                        {botChats.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No chats yet. Add a chat ID and pick which domains it receives.
                          </p>
                        ) : (
                          botChats.map((chat) => (
                            <div
                              key={chat._id}
                              className="bg-white border border-gray-200 rounded-md p-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <div className="font-medium text-gray-900">{chat.label}</div>
                                  <div className="text-xs font-mono text-gray-500">
                                    chat_id: {chat.chatId}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {(chat.scopes || []).length === 0 ? (
                                      <span className="text-xs text-amber-700">
                                        No scopes — receives nothing
                                      </span>
                                    ) : (
                                      chat.scopes.map((s) => (
                                        <span
                                          key={s}
                                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                        >
                                          {domains.find((d) => d.id === s)?.label || s}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditChat(chat)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                                  >
                                    Edit scopes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void toggleChatActive(chat)}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                                  >
                                    {chat.isActive ? 'Pause' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteChat(chat)}
                                    className="text-xs px-2 py-1 border border-red-200 text-red-700 rounded"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <form
                        onSubmit={saveChat}
                        className="bg-white border border-gray-200 rounded-md p-4 space-y-4"
                      >
                        <h3 className="text-sm font-semibold text-gray-800">
                          {editingChatId ? 'Edit chat target' : 'Add chat target'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block text-sm">
                            <span className="text-gray-700">Label</span>
                            <input
                              required
                              value={chatForm.botId === bot._id ? chatForm.label : ''}
                              onChange={(e) =>
                                setChatForm((p) => ({
                                  ...p,
                                  botId: bot._id,
                                  label: e.target.value,
                                }))
                              }
                              onFocus={() =>
                                setChatForm((p) =>
                                  p.botId === bot._id ? p : { ...p, botId: bot._id }
                                )
                              }
                              placeholder="Ops group"
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="text-gray-700">Telegram chat ID</span>
                            <input
                              required
                              value={chatForm.botId === bot._id ? chatForm.chatId : ''}
                              onChange={(e) =>
                                setChatForm((p) => ({
                                  ...p,
                                  botId: bot._id,
                                  chatId: e.target.value,
                                }))
                              }
                              placeholder="-100123…"
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
                            />
                          </label>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Scopes (what this chat receives)
                          </div>
                          <div className="space-y-3">
                            {Object.entries(groupedDomains).map(([group, items]) => (
                              <div key={group}>
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                  {group}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {items.map((d) => {
                                    const checked =
                                      chatForm.botId === bot._id &&
                                      chatForm.scopes.includes(d.id);
                                    return (
                                      <label
                                        key={d.id}
                                        className="flex items-start gap-2 text-sm border border-gray-200 rounded-md px-2 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                      >
                                        <input
                                          type="checkbox"
                                          className="mt-0.5 h-4 w-4 text-red-600 border-gray-300 rounded"
                                          checked={checked}
                                          onChange={() => toggleScope(d.id, bot._id)}
                                        />
                                        <span>
                                          <span className="font-medium text-gray-900">
                                            {d.label}
                                          </span>
                                          <span className="block text-xs text-gray-500">
                                            {d.description}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              className="text-xs text-red-700 underline"
                              onClick={() =>
                                setChatForm((p) => ({
                                  ...p,
                                  botId: bot._id,
                                  scopes: domains.map((d) => d.id),
                                }))
                              }
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              className="text-xs text-gray-600 underline"
                              onClick={() =>
                                setChatForm((p) => ({ ...p, botId: bot._id, scopes: [] }))
                              }
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={savingChat || chatForm.botId !== bot._id}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            {savingChat
                              ? 'Saving…'
                              : editingChatId
                                ? 'Update chat'
                                : 'Add chat'}
                          </button>
                          {editingChatId && (
                            <button
                              type="button"
                              onClick={() => resetChatForm(bot._id)}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
