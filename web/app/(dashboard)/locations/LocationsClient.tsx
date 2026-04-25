'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { WarehouseLocation } from '@/lib/types';

const LOCATION_TYPES = [
  { value: 'bin',     label: 'Bin' },
  { value: 'rack',    label: 'Rack' },
  { value: 'dock',    label: 'Dock' },
  { value: 'virtual', label: 'Virtual' },
];

const TYPE_VARIANT: Record<string, 'blue' | 'green' | 'amber' | 'gray'> = {
  bin:     'green',
  rack:    'blue',
  dock:    'amber',
  virtual: 'gray',
};

const COLUMNS: Column<WarehouseLocation>[] = [
  { key: 'code',  header: 'Code', sortable: true },
  { key: 'zone',  header: 'Zone',  render: (r) => r.zone  ?? '—' },
  { key: 'aisle', header: 'Aisle', render: (r) => r.aisle ?? '—' },
  {
    key: 'section',
    header: 'Section / Shelf',
    render: (r) => [r.section, r.shelf_level].filter(Boolean).join(' › ') || '—',
  },
  {
    key: 'travel_sequence',
    header: 'Pick Seq.',
    className: 'tabular-nums',
    render: (r) => r.travel_sequence != null ? String(r.travel_sequence) : '—',
  },
  {
    key: 'location_type',
    header: 'Type',
    render: (r) => (
      <Badge variant={TYPE_VARIANT[r.location_type] ?? 'gray'}>
        {r.location_type}
      </Badge>
    ),
  },
  {
    key: 'is_virtual',
    header: 'Virtual',
    render: (r) => r.is_virtual ? <Badge variant="gray">Virtual</Badge> : null,
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (r) => (
      <Badge variant={r.is_active ? 'green' : 'gray'}>
        {r.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  { key: 'notes', header: 'Notes', render: (r) => (
    <span className="text-xs text-neutral-500 truncate max-w-[200px] block">{r.notes ?? '—'}</span>
  )},
];

const EMPTY_FORM = {
  code:            '',
  zone:            '',
  aisle:           '',
  section:         '',
  shelf_level:     '',
  travel_sequence: '',
  location_type:   'bin',
  is_virtual:      false,
  is_active:       true,
  notes:           '',
};

type FormState = typeof EMPTY_FORM;

export default function LocationsClient({ locations: initial }: { locations: WarehouseLocation[] }) {
  const router = useRouter();
  const [locations, setLocations] = useState(initial);

  const [open,     setOpen]     = useState(false);
  const [editLoc,  setEditLoc]  = useState<WarehouseLocation | null>(null);
  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  function openCreate() {
    setEditLoc(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  }

  function openEdit(loc: WarehouseLocation) {
    setEditLoc(loc);
    setForm({
      code:            loc.code,
      zone:            loc.zone            ?? '',
      aisle:           loc.aisle           ?? '',
      section:         loc.section         ?? '',
      shelf_level:     loc.shelf_level     ?? '',
      travel_sequence: loc.travel_sequence != null ? String(loc.travel_sequence) : '',
      location_type:   loc.location_type,
      is_virtual:      loc.is_virtual,
      is_active:       loc.is_active,
      notes:           loc.notes           ?? '',
    });
    setError('');
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        code:            form.code,
        zone:            form.zone            || null,
        aisle:           form.aisle           || null,
        section:         form.section         || null,
        shelf_level:     form.shelf_level     || null,
        travel_sequence: form.travel_sequence ? parseInt(form.travel_sequence, 10) : null,
        location_type:   form.location_type   || null,
        is_virtual:      form.is_virtual,
        is_active:       form.is_active,
        notes:           form.notes           || null,
      };

      if (editLoc) {
        await clientFetch(`/api/v1/locations/${editLoc.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await clientFetch('/api/v1/locations', {
          method: 'POST',
          body: JSON.stringify(payload),
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

  const inputCls = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white';

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Warehouse Locations</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {locations.length} location{locations.length !== 1 ? 's' : ''} · Ordered by pick sequence
          </p>
        </div>
        <DataTable
          columns={COLUMNS}
          toolbar={<Button onClick={openCreate}>+ New Location</Button>}
          data={locations}
          onRowClick={(row) => openEdit(row)}
          actions={(row) => [
            { label: 'Edit', onClick: () => openEdit(row) },
          ]}
        />

        <div className="text-xs text-neutral-400 space-y-1 pt-2">
          <p><strong className="text-neutral-500">Pick sequence:</strong> Bins are picked in travel_sequence order — an S-shape (serpentine) walk through the warehouse minimises travel distance.</p>
          <p><strong className="text-neutral-500">Virtual locations:</strong> In-Transit and Quarantine do not hold physical stock; they track goods in movement or on hold.</p>
        </div>
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editLoc ? editLoc.code : 'New Location'}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Location Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className={inputCls}
              placeholder="e.g. RM-A1-01"
              disabled={!!editLoc}
            />
            {!editLoc && (
              <p className="text-[11px] text-neutral-400 mt-1">Unique identifier — cannot be changed after creation.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Zone</label>
              <input type="text" value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                className={inputCls} placeholder="e.g. A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Aisle</label>
              <input type="text" value={form.aisle}
                onChange={(e) => setForm((f) => ({ ...f, aisle: e.target.value }))}
                className={inputCls} placeholder="e.g. 01" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Section</label>
              <input type="text" value={form.section}
                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                className={inputCls} placeholder="e.g. B" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Shelf Level</label>
              <input type="text" value={form.shelf_level}
                onChange={(e) => setForm((f) => ({ ...f, shelf_level: e.target.value }))}
                className={inputCls} placeholder="e.g. 3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Pick Sequence</label>
            <input type="number" min="1" step="1" value={form.travel_sequence}
              onChange={(e) => setForm((f) => ({ ...f, travel_sequence: e.target.value }))}
              className={inputCls} placeholder="Leave blank to exclude from pick path" />
            <p className="text-[11px] text-neutral-400 mt-1">Lower number = picked earlier in S-shape route.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
            <ComboBox
              value={form.location_type}
              onChange={(v) => setForm((f) => ({ ...f, location_type: v }))}
              options={LOCATION_TYPES}
              className={inputCls}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_virtual}
                onChange={(e) => setForm((f) => ({ ...f, is_virtual: e.target.checked }))}
                className="rounded"
              />
              Virtual location
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded"
              />
              Active
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Optional description"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editLoc ? 'Save Changes' : 'Create Location'}
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
