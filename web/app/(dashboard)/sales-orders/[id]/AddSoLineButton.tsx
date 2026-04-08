'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Item, Uom } from '@/lib/types';

interface Props {
  soId:  string;
  items: Item[];
  uoms:  Uom[];
}

export default function AddSoLineButton({ soId, items, uoms }: Props) {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({
    item_id:    '',
    qty_ordered: '',
    uom_id:     '',
    unit_price: '',
    notes:      '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await clientFetch(`/api/v1/sales-orders/${soId}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          item_id:    form.item_id,
          qty_ordered: form.qty_ordered,
          uom_id:     form.uom_id,
          unit_price: form.unit_price || null,
          notes:      form.notes      || null,
        }),
      });
      setOpen(false);
      setForm({ item_id: '', qty_ordered: '', uom_id: '', unit_price: '', notes: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Line</Button>
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add Sales Order Line">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <select required value={form.item_id}
              onChange={(e) => {
                const item = items.find((i) => i.id === e.target.value);
                setForm({ ...form, item_id: e.target.value, uom_id: item?.uom_id ?? form.uom_id });
              }}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.item_code} — {i.description}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Ordered</label>
              <input required type="number" min="0.0001" step="any" value={form.qty_ordered}
                onChange={(e) => setForm({ ...form, qty_ordered: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <select required value={form.uom_id}
                onChange={(e) => setForm({ ...form, uom_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
                <option value="">Select</option>
                {uoms.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Unit Price (optional)</label>
            <input type="number" min="0" step="0.0001" value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes (optional)</label>
            <input type="text" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Adding…' : 'Add Line'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
