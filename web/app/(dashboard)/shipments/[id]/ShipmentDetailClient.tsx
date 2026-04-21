'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge, { shipmentStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { clientFetch } from '@/lib/client-api';
import { updateShipmentStatus } from '@/lib/mutations';
import type { Shipment, ShipmentLine, ShippingDocument, Item, Uom, ProductionBatch } from '@/lib/types';

const NEXT_STATUS: Record<string, string> = {
  loading:    'dispatched',
  dispatched: 'in_transit',
  in_transit: 'delivered',
};

const STATUS_LABEL: Record<string, string> = {
  dispatched: 'Mark Dispatched',
  in_transit: 'Mark In Transit',
  delivered:  'Mark Delivered',
};

function fmt(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString() : '—';
}

interface Props {
  shipment:  Shipment;
  lines:     ShipmentLine[];
  documents: ShippingDocument[];
  soMap:     Record<string, string>;
  items:     Item[];
  itemMap:   Record<string, string>;
  uoms:      Uom[];
  uomMap:    Record<string, string>;
  batches:   ProductionBatch[];
}

export default function ShipmentDetailClient({
  shipment, lines, documents, soMap, items, itemMap, uoms, uomMap, batches,
}: Props) {
  const router = useRouter();

  // Add-line form
  const [lineOpen,    setLineOpen]    = useState(false);
  const [lineForm,    setLineForm]    = useState({ item_id: '', qty_shipped: '', uom_id: '', batch_id: '' });
  const [lineSaving,  setLineSaving]  = useState(false);
  const [lineError,   setLineError]   = useState('');

  // Add-document form
  const [docOpen,     setDocOpen]     = useState(false);
  const [docForm,     setDocForm]     = useState({ doc_type: '', file_url: '' });
  const [docSaving,   setDocSaving]   = useState(false);
  const [docError,    setDocError]    = useState('');

  // Status
  const [statusError, setStatusError] = useState('');

  const nextStatus = NEXT_STATUS[shipment.status];

  async function handleAdvanceStatus() {
    if (!nextStatus) return;
    setStatusError('');
    try {
      await updateShipmentStatus(shipment.id, nextStatus);
      router.refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    setLineError('');
    setLineSaving(true);
    try {
      await clientFetch(`/api/v1/shipments/${shipment.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          item_id:     lineForm.item_id,
          qty_shipped: lineForm.qty_shipped,
          uom_id:      lineForm.uom_id,
          batch_id:    lineForm.batch_id || null,
        }),
      });
      setLineOpen(false);
      setLineForm({ item_id: '', qty_shipped: '', uom_id: '', batch_id: '' });
      router.refresh();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLineSaving(false);
    }
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    setDocError('');
    setDocSaving(true);
    try {
      await clientFetch(`/api/v1/shipments/${shipment.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          shipment_id: shipment.id,
          doc_type:    docForm.doc_type,
          file_url:    docForm.file_url,
        }),
      });
      setDocOpen(false);
      setDocForm({ doc_type: '', file_url: '' });
      router.refresh();
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setDocSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Shipment</p>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Sales Order</span>
              <span className="font-medium">{soMap[shipment.sales_order_id] ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Carrier</span>
              <span>{shipment.carrier ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Tracking</span>
              <span className="font-mono text-xs">{shipment.tracking_number ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Notes</span>
              <span className="text-right max-w-[160px] truncate">{shipment.notes ?? '—'}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</p>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Current</span>
              <Badge variant={shipmentStatusVariant(shipment.status)}>{shipment.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Loaded</span>
              <span>{fmt(shipment.loaded_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Dispatched</span>
              <span>{fmt(shipment.dispatched_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Delivered</span>
              <span>{fmt(shipment.delivered_at)}</span>
            </div>
            {nextStatus && (
              <div className="pt-2">
                <Button onClick={handleAdvanceStatus} className="w-full">
                  {STATUS_LABEL[nextStatus]}
                </Button>
              </div>
            )}
            {statusError && (
              <p className="text-xs text-red-600">{statusError}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Summary</p>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Lines</span>
              <span className="font-medium">{lines.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Qty</span>
              <span className="font-medium tabular-nums">
                {lines.reduce((acc, l) => acc + Number(l.qty_shipped), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Documents</span>
              <span className="font-medium">{documents.length}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Shipment Lines */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Shipment Lines</p>
          {shipment.status === 'loading' && (
            <Button onClick={() => setLineOpen(true)}>+ Add Line</Button>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          {lines.length === 0 ? (
            <div className="px-4 py-6 text-sm text-neutral-400">No lines yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  {['Item', 'Batch', 'Qty Shipped', 'UOM'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const batch = batches.find((b) => b.id === line.batch_id);
                  return (
                    <tr key={line.id} className="border-b-[0.5px] border-neutral-100 last:border-0">
                      <td className="px-4 py-3">{itemMap[line.item_id] ?? line.item_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{batch?.batch_number ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{Number(line.qty_shipped).toLocaleString()}</td>
                      <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? line.uom_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Shipping Documents */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Shipping Documents</p>
          <Button onClick={() => setDocOpen(true)}>+ Add Document</Button>
        </CardHeader>
        <CardBody>
          {documents.length === 0 ? (
            <p className="text-sm text-neutral-400">No documents attached</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm py-2 border-b-[0.5px] border-neutral-100 last:border-0">
                  <div>
                    <span className="font-medium">{doc.doc_type}</span>
                    {doc.issued_at && (
                      <span className="ml-2 text-xs text-neutral-400">{new Date(doc.issued_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add Line slide-over */}
      <SlideOver open={lineOpen} onClose={() => setLineOpen(false)} title="Add Shipment Line">
        <form onSubmit={handleAddLine} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <ComboBox
              required
              value={lineForm.item_id}
              onChange={(v) => {
                const item = items.find((i) => i.id === v);
                setLineForm({ ...lineForm, item_id: v, uom_id: item?.uom_id ?? lineForm.uom_id, batch_id: '' });
              }}
              options={items.filter((i) => i.item_type === 'FG').map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select item"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Production Batch (optional)</label>
            <ComboBox
              value={lineForm.batch_id}
              onChange={(v) => setLineForm({ ...lineForm, batch_id: v })}
              options={[
                { value: '', label: '— no batch —' },
                ...batches.filter((b) => !lineForm.item_id || b.manufacturing_order_id).map((b) => ({ value: b.id, label: b.batch_number })),
              ]}
              placeholder="— no batch —"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Shipped</label>
              <input required type="number" min="0.0001" step="any"
                value={lineForm.qty_shipped}
                onChange={(e) => setLineForm({ ...lineForm, qty_shipped: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <ComboBox
                required
                value={lineForm.uom_id}
                onChange={(v) => setLineForm({ ...lineForm, uom_id: v })}
                options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                placeholder="Select"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
          </div>
          {lineError && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{lineError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={lineSaving} className="flex-1">{lineSaving ? 'Adding…' : 'Add Line'}</Button>
            <Button type="button" variant="secondary" onClick={() => setLineOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>

      {/* Add Document slide-over */}
      <SlideOver open={docOpen} onClose={() => setDocOpen(false)} title="Add Shipping Document">
        <form onSubmit={handleAddDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Document Type</label>
            <ComboBox
              required
              freeform
              value={docForm.doc_type}
              onChange={(v) => setDocForm({ ...docForm, doc_type: v })}
              options={[
                { value: 'Bill of Lading',     label: 'Bill of Lading' },
                { value: 'Packing List',       label: 'Packing List' },
                { value: 'COA',                label: 'COA' },
                { value: 'COO',                label: 'COO' },
                { value: 'Commercial Invoice', label: 'Commercial Invoice' },
              ]}
              placeholder="Select type"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">File URL</label>
            <input required type="url" placeholder="https://…"
              value={docForm.file_url}
              onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {docError && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{docError}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={docSaving} className="flex-1">{docSaving ? 'Saving…' : 'Save Document'}</Button>
            <Button type="button" variant="secondary" onClick={() => setDocOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
