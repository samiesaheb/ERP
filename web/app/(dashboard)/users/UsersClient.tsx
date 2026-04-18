'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { User } from '@/lib/types';

const ROLES = ['admin', 'planner', 'supervisor', 'warehouse', 'qc', 'purchasing', 'sales', 'subcontractor'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const ROLE_VARIANTS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  admin:         'red',
  planner:       'blue',
  supervisor:    'green',
  warehouse:     'amber',
  qc:            'amber',
  purchasing:    'blue',
  sales:         'green',
  subcontractor: 'gray',
};

function formatTimeWindow(user: User): string {
  if (!user.access_time_start && !user.access_time_end && !user.allowed_days) return '—';
  const parts: string[] = [];
  if (user.allowed_days) parts.push(user.allowed_days);
  if (user.access_time_start && user.access_time_end)
    parts.push(`${user.access_time_start}–${user.access_time_end} UTC`);
  return parts.join(' · ');
}

const BASE_COLUMNS: Column<User>[] = [
  { key: 'full_name', header: 'Name',  sortable: true },
  { key: 'email',     header: 'Email', sortable: true },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    render: (row) => (
      <Badge variant={ROLE_VARIANTS[row.role] ?? 'gray'}>
        {row.role}
      </Badge>
    ),
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.is_active ? 'green' : 'gray'}>
        {row.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'allowed_days',
    header: 'Access Window',
    render: (row) => (
      <span className="text-xs text-neutral-500">{formatTimeWindow(row)}</span>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

const EMPTY_FORM = {
  email:              '',
  full_name:          '',
  password:           '',
  role:               'admin',
  allowed_days:       [] as string[],   // selected day names
  access_time_start:  '',
  access_time_end:    '',
};

type FormState = typeof EMPTY_FORM;

export default function UsersClient({ users: initial }: { users: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  useEffect(() => { setUsers(initial); }, [initial]);
  const [open, setOpen]       = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function parseDays(val: string | null): string[] {
    if (!val || !val.trim()) return [];
    return val.split(',').map((d) => d.trim()).filter(Boolean);
  }

  function openCreate() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({
      email:             user.email,
      full_name:         user.full_name,
      password:          '',
      role:              user.role,
      allowed_days:      parseDays(user.allowed_days),
      access_time_start: user.access_time_start ?? '',
      access_time_end:   user.access_time_end   ?? '',
    });
    setError('');
    setOpen(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      allowed_days: f.allowed_days.includes(day)
        ? f.allowed_days.filter((d) => d !== day)
        : [...f.allowed_days, day],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const daysValue = form.allowed_days.length > 0 ? form.allowed_days.join(',') : null;

      if (editUser) {
        const body: Record<string, unknown> = {
          full_name:         form.full_name    || null,
          role:              form.role         || null,
          allowed_days:      daysValue,
          access_time_start: form.access_time_start || '',
          access_time_end:   form.access_time_end   || '',
        };
        if (form.password) body.password = form.password;
        await clientFetch(`/api/v1/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await clientFetch('/api/v1/users', {
          method: 'POST',
          body: JSON.stringify({
            email:             form.email,
            password:          form.password,
            full_name:         form.full_name,
            role:              form.role,
            allowed_days:      daysValue,
            access_time_start: form.access_time_start || null,
            access_time_end:   form.access_time_end   || null,
          }),
        });
      }
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    try {
      await clientFetch(`/api/v1/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch {
      // ignore
    }
  }

  const columns: Column<User>[] = [
    ...BASE_COLUMNS,
    {
      key: 'id',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="text-xs text-neutral-500 hover:text-neutral-900 underline"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleActive(row); }}
            className={`text-xs underline ${row.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  const inputCls = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white';

  return (
    <>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Users</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <DataTable columns={columns} toolbar={<Button onClick={openCreate}>+ New User</Button>} data={users} />
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editUser ? 'Edit User' : 'New User'}
      >
        <div className="space-y-5">
          {/* ── Identity ── */}
          {!editUser && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
                placeholder="user@example.com"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className={inputCls}
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              {editUser ? 'New Password (leave blank to keep)' : 'Password *'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputCls}
              placeholder={editUser ? '••••••••' : 'Min 8 characters'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* ── Access Window ── */}
          <div className="border-t border-neutral-100 pt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-neutral-700 mb-0.5">Access Window</p>
              <p className="text-[11px] text-neutral-400">Leave blank for unrestricted access. Times are UTC.</p>
            </div>

            {/* Day toggles */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">Allowed Days</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((day) => {
                  const selected = form.allowed_days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        selected
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {form.allowed_days.length === 0 && (
                <p className="text-[11px] text-neutral-400 mt-1.5">No day restriction</p>
              )}
            </div>

            {/* Time window */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">Time Window (UTC)</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.access_time_start}
                  onChange={(e) => setForm((f) => ({ ...f, access_time_start: e.target.value }))}
                  className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <span className="text-xs text-neutral-400 shrink-0">to</span>
                <input
                  type="time"
                  value={form.access_time_end}
                  onChange={(e) => setForm((f) => ({ ...f, access_time_end: e.target.value }))}
                  className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
              {(!form.access_time_start && !form.access_time_end) && (
                <p className="text-[11px] text-neutral-400 mt-1.5">No time restriction</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
