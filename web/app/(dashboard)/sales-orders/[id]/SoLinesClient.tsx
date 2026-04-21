'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DropdownMenu from '@/components/ui/DropdownMenu';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Bom, BomLine, Item, Uom } from '@/lib/types';

interface SoLine {
  id: string;
  sales_order_id: string;
  item_id: string;
  qty_ordered: string;
  uom_id: string;
  unit_price: string | null;
  notes: string | null;
  bom_id: string | null;
}

interface Props {
  soId: string;
  lines: SoLine[];
  items: Item[];
  uoms: Uom[];
  boms: Bom[];
  itemMap: Record<string, string>;
  uomMap: Record<string, string>;
  readonly?: boolean;
}

function formatNumber(value: string | null | undefined) {
  if (!value) return '—';
  return Number(value).toLocaleString();
}

const EMPTY_FORM = {
  item_id: '',
  qty_ordered: '',
  uom_id: '',
  unit_price: '',
  notes: '',
  bom_id: '',
};

export default function SoLinesClient({ soId, lines: initialLines, items, uoms, boms, itemMap, uomMap, readonly }: Props) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [open, setOpen] = useState(false);
  const [editLine, setEditLine] = useState<SoLine | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // BOM viewer
  const [bomViewLine, setBomViewLine] = useState<SoLine | null>(null);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [bomLoading, setBomLoading] = useState(false);

  const inputCls = 'w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400';

  async function openBomView(line: SoLine) {
    if (!line.bom_id) return;
    setBomViewLine(line);
    setBomLines([]);
    setBomLoading(true);
    try {
      const data = await clientFetch<BomLine[]>(`/api/v1/boms/${line.bom_id}/lines`);
      setBomLines(data);
    } finally {
      setBomLoading(false);
    }
  }

  /** BOMs that apply to the currently selected item */
  function bomsForItem(itemId: string): Bom[] {
    return boms.filter((b) => b.finished_good_id === itemId);
  }

  /** Find the active BOM for an item (fallback to first if none active) */
  function defaultBomForItem(itemId: string): string {
    const candidates = bomsForItem(itemId);
    return (candidates.find((b) => b.is_active) ?? candidates[0])?.id ?? '';
  }

  function openAdd() {
    setEditLine(null);
    setForm(EMPTY_FORM);
    setError('');
    setOpen(true);
  }

  function openEdit(line: SoLine) {
    setEditLine(line);
    setForm({
      item_id: line.item_id,
      qty_ordered: line.qty_ordered,
      uom_id: line.uom_id,
      unit_price: line.unit_price ?? '',
      notes: line.notes ?? '',
      bom_id: line.bom_id ?? '',
    });
    setError('');
    setOpen(true);
  }

  function handleItemChange(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    setForm((f) => ({
      ...f,
      item_id: itemId,
      uom_id: item?.uom_id ?? f.uom_id,
      bom_id: defaultBomForItem(itemId),
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        item_id: form.item_id,
        qty_ordered: form.qty_ordered,
        uom_id: form.uom_id,
        unit_price: form.unit_price || null,
        notes: form.notes || null,
        bom_id: form.bom_id || null,
      };

      if (editLine) {
        const updated: SoLine = await clientFetch(
          `/api/v1/sales-orders/${soId}/lines/${editLine.id}`,
          { method: 'PUT', body: JSON.stringify(payload) },
        );
        setLines((prev) => prev.map((l) => l.id === editLine.id ? updated : l));
      } else {
        const created: SoLine = await clientFetch(
          `/api/v1/sales-orders/${soId}/lines`,
          { method: 'POST', body: JSON.stringify(payload) },
        );
        setLines((prev) => [...prev, created]);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(line: SoLine) {
    if (!confirm(`Delete line for "${itemMap[line.item_id] ?? line.item_id}"?`)) return;
    setDeletingId(line.id);
    try {
      await clientFetch(`/api/v1/sales-orders/${soId}/lines/${line.id}`, { method: 'DELETE' });
      setLines((prev) => prev.filter((l) => l.id !== line.id));
      router.refresh();
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  const availableBomsForForm = bomsForItem(form.item_id);

  return (
    <>
      <div className="overflow-x-auto">
        {lines.length === 0 ? (
          <div className="px-4 py-4 text-sm text-neutral-400">No line items yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                {[...(readonly ? [] : ['']), 'Item', 'BOM', 'Qty Ordered', 'UOM', 'Unit Price', 'Notes'].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const lineBom = boms.find((b) => b.id === line.bom_id);
                const clickable = !!line.bom_id;
                return (
                  <tr
                    key={line.id}
                    onClick={() => clickable && openBomView(line)}
                    className={`border-b-[0.5px] border-neutral-100 last:border-0 group hover:bg-neutral-50 transition-colors ${clickable ? 'cursor-pointer' : ''}`}
                  >
                    {!readonly && (
                      <td className="px-2 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu
                            align="left"
                            items={[
                              { label: 'Edit', onClick: () => openEdit(line) },
                              {
                                label: deletingId === line.id ? 'Deleting…' : 'Delete',
                                variant: 'danger',
                                disabled: deletingId === line.id,
                                onClick: () => handleDelete(line),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">{itemMap[line.item_id] ?? line.item_id}</td>
                    <td className="px-4 py-3">
                      {lineBom ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                            v{lineBom.version}
                          </span>
                          {lineBom.is_active && (
                            <span className="text-[10px] text-green-600 font-medium">active</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatNumber(line.qty_ordered)}</td>
                    <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? line.uom_id}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {line.unit_price ? `$${formatNumber(line.unit_price)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{line.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!readonly && (
        <div className="px-4 py-3 border-t-[0.5px] border-neutral-100">
          <button
            onClick={openAdd}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline"
          >
            + Add Line
          </button>
        </div>
      )}

      {/* ── BOM Viewer ── */}
      <SlideOver
        open={!!bomViewLine}
        onClose={() => setBomViewLine(null)}
        title={
          bomViewLine
            ? `BOM — ${itemMap[bomViewLine.item_id] ?? bomViewLine.item_id}`
            : 'BOM'
        }
      >
        {bomViewLine && (() => {
          const bom = boms.find((b) => b.id === bomViewLine.bom_id);
          return (
            <div className="space-y-4">
              {/* BOM header */}
              <div className="flex items-center gap-3 pb-2 border-b-[0.5px] border-neutral-100">
                <span className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded">
                  v{bom?.version}
                </span>
                {bom?.is_active && (
                  <span className="text-xs text-green-600 font-medium">Active</span>
                )}
                {bom?.description && (
                  <span className="text-xs text-neutral-500">{bom.description}</span>
                )}
              </div>

              {/* Component lines */}
              {bomLoading ? (
                <div className="py-6 text-center text-sm text-neutral-400">Loading…</div>
              ) : bomLines.length === 0 ? (
                <div className="py-6 text-center text-sm text-neutral-400">No components defined</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-[0.5px] border-neutral-200">
                      {['Component', 'Qty Required', 'UOM', 'Notes'].map((h) => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bomLines.map((bl) => (
                      <tr key={bl.id} className="border-b-[0.5px] border-neutral-100 last:border-0">
                        <td className="py-2.5 pr-4">
                          <span className="text-neutral-800">{itemMap[bl.component_item_id] ?? bl.component_item_id}</span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-neutral-700">
                          {formatNumber(bl.qty_required)}
                        </td>
                        <td className="py-2.5 pr-4 text-neutral-500">
                          {uomMap[bl.uom_id] ?? bl.uom_id}
                        </td>
                        <td className="py-2.5 text-neutral-400 text-xs">
                          {bl.notes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </SlideOver>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editLine ? 'Edit Line' : 'Add Line'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <ComboBox
              required
              value={form.item_id}
              onChange={(v) => handleItemChange(v)}
              options={items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select item"
              className={inputCls}
            />
          </div>

          {/* BOM selection — only shown when the item has at least one BOM */}
          {availableBomsForForm.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">BOM</label>
              <ComboBox
                value={form.bom_id}
                onChange={(v) => setForm((f) => ({ ...f, bom_id: v }))}
                options={[
                  { value: '', label: 'None' },
                  ...availableBomsForForm.map((b) => ({
                    value: b.id,
                    label: `v${b.version}${b.is_active ? ' (active)' : ''}${b.description ? ` — ${b.description}` : ''}`,
                  })),
                ]}
                className={inputCls}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Ordered</label>
              <input
                required
                type="number"
                min="0.0001"
                step="any"
                value={form.qty_ordered}
                onChange={(e) => setForm((f) => ({ ...f, qty_ordered: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <ComboBox
                required
                value={form.uom_id}
                onChange={(v) => setForm((f) => ({ ...f, uom_id: v }))}
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
              value={form.unit_price}
              onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving…' : editLine ? 'Save Changes' : 'Add Line'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
