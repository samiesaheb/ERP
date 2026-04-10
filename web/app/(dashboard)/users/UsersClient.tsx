'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { User } from '@/lib/types';

const ROLES = ['admin', 'planner', 'supervisor', 'warehouse', 'qc', 'purchasing', 'sales', 'subcontractor'];

const ROLE_VARIANTS: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'gray'> = {
  admin:          'red',
  planner:        'blue',
  supervisor:     'green',
  warehouse:      'amber',
  qc:             'amber',
  purchasing:     'blue',
  sales:          'green',
  subcontractor:  'gray',
};

const COLUMNS: Column<User>[] = [
  { key: 'full_name', header: 'Name', sortable: true },
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
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function UsersClient({ users: initial }: { users: User[] }) {
  const router  = useRouter();
  const [users, setUsers] = useState(initial);
  const [open, setOpen]   = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const emptyForm = { email: '', full_name: '', password: '', role: 'admin' };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function openCreate() {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setForm({ email: user.email, full_name: user.full_name, password: '', role: user.role });
    setError('');
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const body: Record<string, unknown> = {
          full_name: form.full_name || null,
          role:      form.role || null,
        };
        if (form.password) body.password = form.password;
        await clientFetch(`/api/v1/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await clientFetch('/api/v1/users', { method: 'POST', body: JSON.stringify(form) });
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
    ...COLUMNS,
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

  return (
    <>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Users</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex justify-start">
          <Button onClick={openCreate}>+ New User</Button>
        </div>

        <DataTable columns={columns} data={users} />
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editUser ? 'Edit User' : 'New User'}
      >
        <div className="space-y-4">
          {!editUser && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
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
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
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
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder={editUser ? '••••••••' : 'Min 8 characters'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
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
