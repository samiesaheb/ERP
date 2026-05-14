'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateArtworkStatus, updateFdaStatus } from '@/lib/mutations';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { Artwork, FdaRegistration, SalesOrder, Item } from '@/lib/types';

// ---------------------------------------------------------------------------
// Artworks tab
// ---------------------------------------------------------------------------

type ArtworkRow = Artwork & { so_number: string; item_label: string };

const ARTWORK_COLUMNS = (t: (k: string) => string): Column<ArtworkRow>[] => [
  { key: 'so_number',  header: t('Sales Order'), sortable: true },
  { key: 'item_label', header: t('Item') },
  { key: 'version',    header: t('Ver'), render: (r) => `v${r.version}` },
  {
    key: 'status',
    header: t('Status'),
    sortable: true,
    render: (r) => (
      <Badge
        variant={
          r.status === 'approved'  ? 'green'
          : r.status === 'rejected'  ? 'red'
          : r.status === 'in_review' ? 'amber'
          : 'gray'
        }
      >
        {r.status}
      </Badge>
    ),
  },
  {
    key: 'submitted_at',
    header: t('Submitted'),
    render: (r) => r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—',
  },
  {
    key: 'approved_at',
    header: t('Approved'),
    render: (r) => r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '—',
  },
  {
    key: 'created_at',
    header: t('Created'),
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

// ---------------------------------------------------------------------------
// FDA tab
// ---------------------------------------------------------------------------

type FdaRow = FdaRegistration & { so_number: string; item_label: string };

const FDA_COLUMNS = (t: (k: string) => string): Column<FdaRow>[] => [
  { key: 'so_number',           header: t('Sales Order'), sortable: true },
  { key: 'item_label',          header: t('Item') },
  { key: 'registration_number', header: t('Reg #'),
    render: (r) => r.registration_number ?? '—' },
  {
    key: 'status',
    header: t('Status'),
    sortable: true,
    render: (r) => (
      <Badge
        variant={
          r.status === 'approved'  ? 'green'
          : r.status === 'rejected'  ? 'red'
          : r.status === 'submitted' ? 'amber'
          : 'gray'
        }
      >
        {r.status}
      </Badge>
    ),
  },
  { key: 'expiry_date', header: t('Expires'),
    render: (r) => r.expiry_date ?? '—' },
  { key: 'created_at', header: t('Created'), sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString() },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  artworks:         Artwork[];
  fdaRegistrations: FdaRegistration[];
  salesOrders:      SalesOrder[];
  items:            Item[];
}

export default function ArtworkClient({ artworks, fdaRegistrations, salesOrders, items }: Props) {
  const router = useRouter();
  const { t } = useAppPrefs();
  const [tab, setTab] = useState<'artwork' | 'fda'>('artwork');

  // Artwork form
  const [artOpen,    setArtOpen]    = useState(false);
  const [artForm,    setArtForm]    = useState({ sales_order_id: '', item_id: '', version: '1', file_url: '', notes: '' });
  const [artSaving,  setArtSaving]  = useState(false);
  const [artError,   setArtError]   = useState('');

  // FDA form
  const [fdaOpen,    setFdaOpen]    = useState(false);
  const [fdaForm,    setFdaForm]    = useState({
    sales_order_id:      '',
    item_id:             '',
    registration_number: '',
    expiry_date:         '',
    notes:               '',
  });
  const [fdaSaving,  setFdaSaving]  = useState(false);
  const [fdaError,   setFdaError]   = useState('');

  const soMap   = Object.fromEntries(salesOrders.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));

  const artworkRows: ArtworkRow[] = artworks.map((a) => ({
    ...a,
    so_number:  soMap[a.sales_order_id]  ?? a.sales_order_id,
    item_label: itemMap[a.item_id]       ?? a.item_id,
  }));

  const fdaRows: FdaRow[] = fdaRegistrations.map((f) => ({
    ...f,
    so_number:  soMap[f.sales_order_id]  ?? f.sales_order_id,
    item_label: itemMap[f.item_id]       ?? f.item_id,
  }));

  // Artwork handlers
  async function handleSaveArtwork() {
    setArtError('');
    setArtSaving(true);
    try {
      await clientFetch('/api/v1/artworks', {
        method: 'POST',
        body: JSON.stringify({
          sales_order_id: artForm.sales_order_id,
          item_id:        artForm.item_id,
          version:        Number(artForm.version) || 1,
          file_url:       artForm.file_url || null,
          notes:          artForm.notes    || null,
        }),
      });
      setArtOpen(false);
      setArtForm({ sales_order_id: '', item_id: '', version: '1', file_url: '', notes: '' });
      router.refresh();
    } catch (err) {
      setArtError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setArtSaving(false);
    }
  }

  // FDA handlers
  async function handleSaveFda(e: React.FormEvent) {
    e.preventDefault();
    setFdaError('');
    setFdaSaving(true);
    try {
      await clientFetch('/api/v1/fda-registrations', {
        method: 'POST',
        body: JSON.stringify({
          sales_order_id:      fdaForm.sales_order_id,
          item_id:             fdaForm.item_id,
          registration_number: fdaForm.registration_number || null,
          expiry_date:         fdaForm.expiry_date         || null,
          notes:               fdaForm.notes               || null,
        }),
      });
      setFdaOpen(false);
      setFdaForm({ sales_order_id: '', item_id: '', registration_number: '', expiry_date: '', notes: '' });
      router.refresh();
    } catch (err) {
      setFdaError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setFdaSaving(false);
    }
  }

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-neutral-100 rounded-xl p-1 w-fit mb-4">
        {(['artwork', 'fda'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
              tab === tabKey
                ? 'bg-white text-neutral-900 shadow-sm ring-[0.5px] ring-neutral-900/[0.06]'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tabKey === 'artwork' ? t('Artworks') : t('FDA Registrations')}
          </button>
        ))}
      </div>

      {/* ---- Artworks tab ---- */}
      {tab === 'artwork' && (
        <>
          <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
            <DataTable
              columns={ARTWORK_COLUMNS(t)}
              toolbar={<Button onClick={() => setArtOpen(true)}>+ New Artwork</Button>}
              data={artworkRows}
              searchable
              actions={(row) => {
                const items: { label: string; onClick: () => void; variant?: 'danger' }[] = [];
                if (row.status === 'draft') {
                  items.push({
                    label: 'Submit for Review',
                    onClick: () => updateArtworkStatus(row.id, 'in_review').then(() => router.refresh()),
                  });
                }
                if (row.status === 'in_review') {
                  items.push({
                    label: 'Approve',
                    onClick: () => updateArtworkStatus(row.id, 'approved').then(() => router.refresh()),
                  });
                  items.push({
                    label: 'Reject',
                    onClick: () => updateArtworkStatus(row.id, 'rejected').then(() => router.refresh()),
                    variant: 'danger',
                  });
                }
                return items;
              }}
            />
          </div>

          <SlideOver open={artOpen} onClose={() => setArtOpen(false)} title="New Artwork">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
                <ComboBox
                  value={artForm.sales_order_id}
                  onChange={(v) => setArtForm({ ...artForm, sales_order_id: v })}
                  options={salesOrders.map((s) => ({ value: s.id, label: s.order_number }))}
                  placeholder="Select…"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
                <ComboBox
                  value={artForm.item_id}
                  onChange={(v) => setArtForm({ ...artForm, item_id: v })}
                  options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
                  placeholder="Select…"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Version</label>
                <input
                  type="number" min="1" step="1"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                  value={artForm.version}
                  onChange={(e) => setArtForm({ ...artForm, version: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">File URL (optional)</label>
                <input
                  type="url"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                  placeholder="https://…"
                  value={artForm.file_url}
                  onChange={(e) => setArtForm({ ...artForm, file_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={artForm.notes}
                  onChange={(e) => setArtForm({ ...artForm, notes: e.target.value })}
                />
              </div>
              {artError && (
                <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
                  {artError}
                </p>
              )}
              <Button onClick={handleSaveArtwork} disabled={artSaving} className="w-full">
                {artSaving ? 'Creating…' : 'Create Artwork'}
              </Button>
            </div>
          </SlideOver>
        </>
      )}

      {/* ---- FDA Registrations tab ---- */}
      {tab === 'fda' && (
        <>
          <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
            <DataTable
              columns={FDA_COLUMNS(t)}
              toolbar={<Button onClick={() => setFdaOpen(true)}>+ New FDA Registration</Button>}
              data={fdaRows}
              searchable
              actions={(row) => {
                const items: { label: string; onClick: () => void; variant?: 'danger' }[] = [];
                if (row.status === 'pending') {
                  items.push({
                    label: 'Submit',
                    onClick: () => updateFdaStatus(row.id, 'submitted').then(() => router.refresh()),
                  });
                }
                if (row.status === 'submitted') {
                  items.push({
                    label: 'Mark Approved',
                    onClick: () => updateFdaStatus(row.id, 'approved').then(() => router.refresh()),
                  });
                  items.push({
                    label: 'Mark Rejected',
                    onClick: () => updateFdaStatus(row.id, 'rejected').then(() => router.refresh()),
                    variant: 'danger',
                  });
                }
                return items;
              }}
            />
          </div>

          <SlideOver open={fdaOpen} onClose={() => setFdaOpen(false)} title="New FDA Registration">
            <form onSubmit={handleSaveFda} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
                <ComboBox
                  required
                  value={fdaForm.sales_order_id}
                  onChange={(v) => setFdaForm({ ...fdaForm, sales_order_id: v })}
                  options={salesOrders.filter((s) => s.fda_required).map((s) => ({ value: s.id, label: s.order_number }))}
                  placeholder="Select…"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-neutral-400 mt-1">Showing FDA-required orders only</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
                <ComboBox
                  required
                  value={fdaForm.item_id}
                  onChange={(v) => setFdaForm({ ...fdaForm, item_id: v })}
                  options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
                  placeholder="Select…"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={fdaForm.registration_number}
                  onChange={(e) => setFdaForm({ ...fdaForm, registration_number: e.target.value })}
                  placeholder="e.g. FDA-TH-2026-0001"
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={fdaForm.expiry_date}
                  onChange={(e) => setFdaForm({ ...fdaForm, expiry_date: e.target.value })}
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={fdaForm.notes}
                  onChange={(e) => setFdaForm({ ...fdaForm, notes: e.target.value })}
                  className="w-full border-[0.5px] border-neutral-300 rounded px-3 py-2 text-sm resize-none"
                />
              </div>
              {fdaError && (
                <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
                  {fdaError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={fdaSaving} className="flex-1">
                  {fdaSaving ? 'Creating…' : 'Create Registration'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setFdaOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </SlideOver>
        </>
      )}
    </>
  );
}
