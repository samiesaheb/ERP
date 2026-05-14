'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateSalesOrderStatus } from '@/lib/mutations';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { SalesOrder, Customer, Country, Item, Uom } from '@/lib/types';

interface Props {
  orders:      SalesOrder[];
  customerMap: Record<string, string>;
  customers:   Customer[];
  countries:   Country[];
  items:       Item[];
  uoms:        Uom[];
}

const COLUMNS = (t: (k: string) => string, customerMap: Record<string, string>): Column<SalesOrder>[] => [
  { key: 'order_number', header: t('SO #'), sortable: true },
  {
    key: 'customer_id',
    header: t('Customer'),
    render: (r) => customerMap[r.customer_id] ?? r.customer_id,
    sortable: true,
  },
  {
    key: 'total_pieces',
    header: t('Pieces'),
    render: (r) => Number(r.total_pieces).toLocaleString(),
    sortable: true,
    className: 'tabular-nums',
  },
  {
    key: 'status',
    header: t('Status'),
    render: (r) => <Badge variant={soStatusVariant(r.status)}>{r.status}</Badge>,
    sortable: true,
  },
  {
    key: 'artwork_status',
    header: t('Artwork'),
    render: (r) => <Badge variant={r.artwork_status === 'approved' ? 'green' : 'amber'}>{r.artwork_status}</Badge>,
  },
  {
    key: 'fda_required',
    header: t('FDA'),
    render: (r) =>
      r.fda_required ? (
        <Badge variant={r.fda_status === 'approved' ? 'green' : 'amber'}>
          {r.fda_status ?? 'required'}
        </Badge>
      ) : (
        <Badge variant="gray">—</Badge>
      ),
  },
  {
    key: 'required_date',
    header: t('Required By'),
    render: (r) => r.required_date ? new Date(r.required_date).toLocaleDateString() : '—',
    sortable: true,
  },
  {
    key: 'created_at',
    header: t('Created'),
    render: (r) => new Date(r.created_at).toLocaleDateString(),
    sortable: true,
  },
];

const CANCELLABLE = new Set(['draft', 'confirmed', 'in_production']);

type Tab = 'details' | 'products' | 'artwork' | 'fda';

const TABS: { key: Tab; label: string }[] = [
  { key: 'details',  label: 'Details'   },
  { key: 'products', label: 'Products'  },
  { key: 'artwork',  label: 'Artwork'   },
  { key: 'fda',      label: 'FDA'       },
];

interface DetailsForm {
  customer_id:   string;
  country_id:    string;
  total_pieces:  string;
  order_date:    string;
  required_date: string;
  status:        string;
  fda_required:  boolean;
  notes:         string;
}

interface LineForm {
  item_id:     string;
  qty_ordered: string;
  uom_id:      string;
  unit_price:  string;
  notes:       string;
}

interface ArtworkForm {
  item_id:  string;
  version:  string;
  file_url: string;
  notes:    string;
}

interface FdaForm {
  item_id: string;
  notes:   string;
}

const BLANK_DETAILS: DetailsForm = {
  customer_id: '', country_id: '', total_pieces: '', order_date: '',
  required_date: '', status: 'draft', fda_required: false, notes: '',
};
const BLANK_LINE: LineForm       = { item_id: '', qty_ordered: '', uom_id: '', unit_price: '', notes: '' };
const BLANK_ARTWORK: ArtworkForm = { item_id: '', version: '1', file_url: '', notes: '' };
const BLANK_FDA: FdaForm         = { item_id: '', notes: '' };

export default function SalesOrdersClient({ orders, customerMap, customers, countries, items, uoms }: Props) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAppPrefs();
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState<Tab>('details');
  const [details, setDetails] = useState<DetailsForm>(BLANK_DETAILS);
  const [lines, setLines]     = useState<LineForm[]>([]);
  const [draftLine, setDraftLine] = useState<LineForm>(BLANK_LINE);
  const [artwork, setArtwork] = useState<ArtworkForm>(BLANK_ARTWORK);
  const [fda, setFda]         = useState<FdaForm>(BLANK_FDA);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace('/sales-orders', { scroll: false });
    }
  }, [searchParams, router]);

  function handleClose() {
    setOpen(false);
    setTab('details');
    setDetails(BLANK_DETAILS);
    setLines([]);
    setDraftLine(BLANK_LINE);
    setArtwork(BLANK_ARTWORK);
    setFda(BLANK_FDA);
    setError('');
  }

  function addLine() {
    if (!draftLine.item_id || !draftLine.qty_ordered || !draftLine.uom_id) return;
    setLines((prev) => [...prev, draftLine]);
    setDraftLine(BLANK_LINE);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Create the SO
      const so = await clientFetch<{ id: string }>('/api/v1/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id:   details.customer_id,
          country_id:    details.country_id,
          total_pieces:  details.total_pieces,
          order_date:    details.order_date    || null,
          required_date: details.required_date || null,
          fda_required:  details.fda_required,
          notes:         details.notes         || null,
        }),
      });
      const soId = so.id;

      // 2. Update status if not draft
      if (details.status !== 'draft') {
        await clientFetch(`/api/v1/sales-orders/${soId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: details.status }),
        });
      }

      // 3. Create SO lines
      for (const line of lines) {
        await clientFetch(`/api/v1/sales-orders/${soId}/lines`, {
          method: 'POST',
          body: JSON.stringify({
            item_id:     line.item_id,
            qty_ordered: line.qty_ordered,
            uom_id:      line.uom_id,
            unit_price:  line.unit_price || null,
            notes:       line.notes      || null,
          }),
        });
      }

      // 4. Create artwork if item selected
      if (artwork.item_id) {
        await clientFetch('/api/v1/artworks', {
          method: 'POST',
          body: JSON.stringify({
            sales_order_id: soId,
            item_id:        artwork.item_id,
            version:        Number(artwork.version) || 1,
            file_url:       artwork.file_url || null,
            notes:          artwork.notes    || null,
          }),
        });
      }

      // 5. Create FDA registration if item selected
      if (fda.item_id) {
        await clientFetch('/api/v1/fda-registrations', {
          method: 'POST',
          body: JSON.stringify({
            sales_order_id: soId,
            item_id:        fda.item_id,
            notes:          fda.notes || null,
          }),
        });
      }

      handleClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await updateSalesOrderStatus(id, 'cancelled');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400';

  return (
    <>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(t, customerMap)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New Order</Button>}
          data={orders}
          onRowClick={(row) => router.push(`/sales-orders/${row.id}`)}
          actions={(row) => [
            { label: 'View Order', onClick: () => router.push(`/sales-orders/${row.id}`) },
            { label: 'Create MO',  onClick: () => router.push(`/manufacturing-orders?createFor=${row.id}`) },
            ...(CANCELLABLE.has(row.status)
              ? [{ label: 'Cancel Order', onClick: () => handleCancel(row.id), variant: 'danger' as const }]
              : []),
          ]}
        />
      </div>

      <SlideOver open={open} onClose={handleClose} title="New Sales Order">
        {/* Tabs */}
        <div className="flex border-b border-neutral-200 mb-5 -mx-6 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`pb-2.5 mr-5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {t.label}
              {t.key === 'products' && lines.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-neutral-200 text-neutral-600 rounded-full px-1.5 py-0.5">
                  {lines.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Details ── */}
          {tab === 'details' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Customer</label>
                <ComboBox
                  required
                  value={details.customer_id}
                  onChange={(v) => {
                    const c = customers.find((x) => x.id === v);
                    setDetails({ ...details, customer_id: v, country_id: c?.country_id ?? details.country_id });
                  }}
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select customer"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Destination Country</label>
                <ComboBox
                  required
                  value={details.country_id}
                  onChange={(v) => setDetails({ ...details, country_id: v })}
                  options={countries.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Select country"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Total Pieces</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={details.total_pieces}
                    onChange={(e) => setDetails({ ...details, total_pieces: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
                  <ComboBox
                    freeform
                    value={details.status}
                    onChange={(v) => setDetails({ ...details, status: v })}
                    options={[
                      { value: 'draft',     label: 'Draft' },
                      { value: 'confirmed', label: 'Confirmed' },
                    ]}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Order Date</label>
                  <input
                    type="date"
                    value={details.order_date}
                    onChange={(e) => setDetails({ ...details, order_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Required By</label>
                  <input
                    type="date"
                    value={details.required_date}
                    onChange={(e) => setDetails({ ...details, required_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fda_req"
                  checked={details.fda_required}
                  onChange={(e) => setDetails({ ...details, fda_required: e.target.checked })}
                />
                <label htmlFor="fda_req" className="text-sm text-neutral-700">FDA registration required</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={details.notes}
                  onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </>
          )}

          {/* ── Products ── */}
          {tab === 'products' && (
            <div className="space-y-4">
              {/* Existing lines */}
              {lines.length > 0 && (
                <div className="space-y-2">
                  {lines.map((line, idx) => {
                    const item = items.find((i) => i.id === line.item_id);
                    const uom  = uoms.find((u) => u.id === line.uom_id);
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-neutral-50 border-[0.5px] border-neutral-200 rounded-lg text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-800 truncate">
                            {item ? `${item.item_code} — ${item.description}` : line.item_id}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {line.qty_ordered} {uom?.code ?? ''}
                            {line.unit_price ? ` · $${line.unit_price}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="shrink-0 text-neutral-300 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Draft line builder */}
              <div className="border-[0.5px] border-neutral-200 rounded-lg p-3 space-y-3 bg-white">
                <p className="text-xs font-medium text-neutral-500">Add a product line</p>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
                  <ComboBox
                    value={draftLine.item_id}
                    onChange={(v) => {
                      const item = items.find((i) => i.id === v);
                      setDraftLine({ ...draftLine, item_id: v, uom_id: item?.uom_id ?? draftLine.uom_id });
                    }}
                    options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
                    placeholder="Select item"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      placeholder="0"
                      value={draftLine.qty_ordered}
                      onChange={(e) => setDraftLine({ ...draftLine, qty_ordered: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
                    <ComboBox
                      value={draftLine.uom_id}
                      onChange={(v) => setDraftLine({ ...draftLine, uom_id: v })}
                      options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                      placeholder="Select"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Unit Price (optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.00"
                    value={draftLine.unit_price}
                    onChange={(e) => setDraftLine({ ...draftLine, unit_price: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  disabled={!draftLine.item_id || !draftLine.qty_ordered || !draftLine.uom_id}
                  className="w-full py-2 text-sm font-medium text-neutral-700 border-[0.5px] border-dashed border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  + Add Line
                </button>
              </div>
            </div>
          )}

          {/* ── Artwork ── */}
          {tab === 'artwork' && (
            <>
              <p className="text-xs text-neutral-400">Optional — leave Item blank to skip artwork creation.</p>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
                <ComboBox
                  value={artwork.item_id}
                  onChange={(v) => setArtwork({ ...artwork, item_id: v })}
                  options={[{ value: '', label: 'None (skip)' }, ...items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))]}
                  placeholder="Select item (optional)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Version</label>
                <input
                  type="number"
                  min="1"
                  value={artwork.version}
                  onChange={(e) => setArtwork({ ...artwork, version: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">File URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={artwork.file_url}
                  onChange={(e) => setArtwork({ ...artwork, file_url: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={artwork.notes}
                  onChange={(e) => setArtwork({ ...artwork, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </>
          )}

          {/* ── FDA ── */}
          {tab === 'fda' && (
            <>
              <p className="text-xs text-neutral-400">Optional — leave Item blank to skip FDA registration.</p>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
                <ComboBox
                  value={fda.item_id}
                  onChange={(v) => setFda({ ...fda, item_id: v })}
                  options={[{ value: '', label: 'None (skip)' }, ...items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))]}
                  placeholder="Select item (optional)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
                <textarea
                  value={fda.notes}
                  onChange={(e) => setFda({ ...fda, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Order'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
