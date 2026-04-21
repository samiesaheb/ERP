'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Item, Uom } from '@/lib/types';

interface Props {
  poId:  string;
  items: Item[];
  uoms:  Uom[];
}

export default function AddPoLineButton({ poId, items, uoms }: Props) {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({
    item_id:    '',
    qty_ordered: '',
    uom_id:     '',
    unit_cost:  '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await clientFetch(`/api/v1/purchase-orders/${poId}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          item_id:    form.item_id,
          qty_ordered: form.qty_ordered,
          uom_id:     form.uom_id,
          unit_cost:  form.unit_cost || null,
        }),
      });
      setOpen(false);
      setForm({ item_id: '', qty_ordered: '', uom_id: '', unit_cost: '' });
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
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add PO Line">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <ComboBox
              required
              value={form.item_id}
              onChange={(v) => {
                const item = items.find((i) => i.id === v);
                setForm({ ...form, item_id: v, uom_id: item?.uom_id ?? form.uom_id });
              }}
              options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select item"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
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
              <ComboBox
                required
                value={form.uom_id}
                onChange={(v) => setForm({ ...form, uom_id: v })}
                options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                placeholder="Select"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Unit Cost (optional)</label>
            <input type="number" min="0" step="0.0001" value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
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
