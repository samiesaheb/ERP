'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import Badge from '@/components/ui/Badge';
import { clientFetch } from '@/lib/client-api';
import type { WorkCenter } from '@/lib/types';

interface Props {
  workCenters: WorkCenter[];
}

const STATUS_VARIANT: Record<string, 'green' | 'amber' | 'red'> = {
  active:      'green',
  maintenance: 'amber',
  inactive:    'red',
};

const TYPE_LABELS: Record<string, string> = {
  mixer:   'Mixer',
  filler:  'Filler',
  packer:  'Packer',
  lab:     'Lab / QC',
  general: 'General',
};

const COLUMNS: Column<WorkCenter>[] = [
  { key: 'code',        header: 'Code',     sortable: true },
  { key: 'name',        header: 'Name',     sortable: true },
  { key: 'center_type', header: 'Type',     sortable: true,
    render: (r) => TYPE_LABELS[r.center_type] ?? r.center_type },
  { key: 'capacity',    header: 'Capacity / Shift',
    render: (r) => r.capacity ? Number(r.capacity).toLocaleString() : '—' },
  { key: 'status',      header: 'Status',   sortable: true,
    render: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? 'blue'}>{r.status}</Badge> },
  { key: 'notes',       header: 'Notes',
    render: (r) => r.notes ?? '—' },
];

interface Form {
  code:        string;
  name:        string;
  center_type: string;
  capacity:    string;
  notes:       string;
  status:      string;
}

const EMPTY: Form = { code: '', name: '', center_type: 'general', capacity: '', notes: '', status: 'active' };

export default function WorkCentersClient({ workCenters }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<WorkCenter | null>(null);
  const [form,    setForm]    = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  }

  function openEdit(wc: WorkCenter) {
    setEditing(wc);
    setForm({
      code:        wc.code,
      name:        wc.name,
      center_type: wc.center_type,
      capacity:    wc.capacity ?? '',
      notes:       wc.notes ?? '',
      status:      wc.status,
    });
    setError('');
    setOpen(true);
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const body = {
        code:        form.code,
        name:        form.name,
        center_type: form.center_type,
        capacity:    form.capacity ? Number(form.capacity) : null,
        notes:       form.notes || null,
        ...(editing ? { status: form.status } : {}),
      };
      if (editing) {
        await clientFetch(`/api/v1/work-centers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await clientFetch('/api/v1/work-centers', { method: 'POST', body: JSON.stringify(body) });
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DataTable
        data={workCenters}
        columns={COLUMNS}
        onRowClick={openEdit}
        toolbar={<Button variant="primary" size="sm" onClick={openCreate}>+ New Work Center</Button>}
      />

      <SlideOver open={open} onClose={() => setOpen(false)}
        title={editing ? 'Edit Work Center' : 'New Work Center'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Code *</label>
            <input
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              disabled={!!editing}
              placeholder="e.g. MXR-01"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Name *</label>
            <input
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Mixing Tank #1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
            <select className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.center_type} onChange={(e) => set('center_type', e.target.value)}>
              <option value="mixer">Mixer</option>
              <option value="filler">Filler</option>
              <option value="packer">Packer</option>
              <option value="lab">Lab / QC</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Capacity per Shift</label>
            <input
              type="number"
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="Units (optional)"
            />
          </div>
          {editing && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
              <select className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
