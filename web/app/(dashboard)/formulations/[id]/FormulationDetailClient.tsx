'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { patchFormulation } from '@/lib/mutations';
import type { Formulation, FormulationLine, Ingredient } from '@/lib/types';

interface LineState {
  id?: string;
  ingredient: string;
  percentage: string;
  phase: string;
  comment: string;
}

const EMPTY_LINE: LineState = {
  ingredient: '',
  percentage: '',
  phase: '',
  comment: '',
};

export default function FormulationDetailClient({
  formulation,
  ingredients,
}: {
  formulation: Formulation;
  ingredients: Ingredient[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<FormulationLine[]>(formulation.lines ?? []);
  const [note, setNote] = useState(formulation.note ?? '');
  const [noteDirty, setNoteDirty] = useState(false);
  const [isActive, setIsActive] = useState(formulation.is_active);
  const [batchQty, setBatchQty] = useState(formulation.batch_qty ?? '100');
  const [batchUnit, setBatchUnit] = useState(formulation.batch_unit ?? 'g');
  const [batchDirty, setBatchDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [slideOpen, setSlideOpen] = useState(false);
  const [editLine, setEditLine] = useState<LineState | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => {
    setLines(formulation.lines ?? []);
    setNote(formulation.note ?? '');
    setIsActive(formulation.is_active);
    setBatchQty(formulation.batch_qty ?? '100');
    setBatchUnit(formulation.batch_unit ?? 'g');
    setNoteDirty(false);
    setBatchDirty(false);
  }, [formulation]);

  const total = lines.reduce((s, l) => s + parseFloat(l.percentage || '0'), 0);
  const totalOk = Math.abs(total - 100) < 0.01;
  const batchQtyNum = parseFloat(batchQty || '0');

  const ingredientMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  async function save(patch: object) {
    setSaving(true);
    setError('');
    try {
      await patchFormulation(formulation.id, patch);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveLines(nextLines: FormulationLine[]) {
    await save({
      lines: nextLines.map((l) => ({
        ingredient: l.ingredient,
        percentage: l.percentage,
        phase: l.phase,
        comment: l.comment,
      })),
    });
  }

  function openAdd() {
    setEditLine({ ...EMPTY_LINE });
    setEditIdx(null);
    setSlideOpen(true);
  }

  function openEdit(line: FormulationLine, idx: number) {
    setEditLine({
      id: line.id,
      ingredient: line.ingredient,
      percentage: line.percentage,
      phase: line.phase,
      comment: line.comment,
    });
    setEditIdx(idx);
    setSlideOpen(true);
  }

  async function handleLineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editLine || !editLine.ingredient) return;
    const updated = [...lines];
    const asLine: FormulationLine = {
      id: editLine.id ?? '',
      ingredient: editLine.ingredient,
      ingredient_detail:
        ingredientMap[editLine.ingredient]
          ? {
              id: editLine.ingredient,
              code: ingredientMap[editLine.ingredient].code,
              inci_name: ingredientMap[editLine.ingredient].inci_name,
            }
          : null,
      percentage: editLine.percentage,
      phase: editLine.phase,
      comment: editLine.comment,
    };
    if (editIdx === null) {
      updated.push(asLine);
    } else {
      updated[editIdx] = asLine;
    }
    setLines(updated);
    setSlideOpen(false);
    await saveLines(updated);
  }

  async function deleteLine(idx: number) {
    const updated = lines.filter((_, i) => i !== idx);
    setLines(updated);
    await saveLines(updated);
  }

  return (
    <>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Batch qty + Note + Activation row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Batch Quantity
            </p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={batchQty}
                onChange={(e) => {
                  setBatchQty(e.target.value);
                  setBatchDirty(true);
                }}
                className="flex-1 px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded font-mono"
              />
              <select
                value={batchUnit}
                onChange={(e) => {
                  setBatchUnit(e.target.value);
                  setBatchDirty(true);
                }}
                className="w-20 px-2 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            </div>
            {batchDirty && (
              <Button
                className="mt-2"
                disabled={saving}
                onClick={() => {
                  save({ batch_qty: batchQty, batch_unit: batchUnit }).then(() =>
                    setBatchDirty(false),
                  );
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Note
            </p>
          </CardHeader>
          <CardBody>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteDirty(true);
              }}
              placeholder="Formula notes…"
              className="w-full text-sm border-[0.5px] border-neutral-300 rounded px-3 py-2 resize-none"
            />
            {noteDirty && (
              <Button
                className="mt-2"
                disabled={saving}
                onClick={() => {
                  save({ note }).then(() => setNoteDirty(false));
                }}
              >
                {saving ? 'Saving…' : 'Save Note'}
              </Button>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Activation
            </p>
          </CardHeader>
          <CardBody className="flex items-center gap-4">
            <Badge variant={isActive ? 'green' : 'amber'}>
              {isActive ? 'Active' : 'Draft'}
            </Badge>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={async () => {
                const next = !isActive;
                setIsActive(next);
                await save({ is_active: next });
              }}
            >
              {isActive ? 'Set Draft' : 'Set Active'}
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Ingredient Lines — Excel-style: No. | %w/w | Part | Ingredient | INCI | Weight */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Formulation
            <span
              className={`ml-3 font-mono normal-case ${
                totalOk ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {total.toFixed(4)}%w/w{!totalOk && ' ⚠ must equal 100%'}
            </span>
          </p>
          <Button onClick={openAdd}>+ Add Ingredient</Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide w-12">
                  No.
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide w-24">
                  %w/w
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide w-16">
                  Part
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Ingredient
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  INCI
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide w-28">
                  Weight ({batchUnit})
                </th>
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-neutral-400"
                  >
                    No ingredients yet — click "Add Ingredient" to start.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const ing =
                    line.ingredient_detail ?? ingredientMap[line.ingredient];
                  const pct = parseFloat(line.percentage || '0');
                  const weight = batchQtyNum * pct / 100;
                  return (
                    <tr
                      key={line.id || idx}
                      className="border-b-[0.5px] border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="px-3 py-3 text-center text-xs text-neutral-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                        {pct.toFixed(4)}
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-medium">
                        {line.phase || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-medium">
                        {ing?.code ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-500 italic">
                        {ing?.inci_name ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                        {batchQtyNum > 0 ? weight.toFixed(4) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEdit(line, idx)}
                            className="text-xs text-neutral-500 hover:text-neutral-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteLine(idx)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                  <td className="px-3 py-2.5 text-xs text-neutral-500 text-center">—</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                    <span className={totalOk ? 'text-green-600' : 'text-amber-600'}>
                      {total.toFixed(4)}
                    </span>
                  </td>
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-neutral-400">Total</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                    {batchQtyNum > 0
                      ? (lines.reduce((s, l) => s + batchQtyNum * parseFloat(l.percentage || '0') / 100, 0)).toFixed(4)
                      : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Add / Edit Ingredient SlideOver */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editIdx === null ? 'Add Ingredient' : 'Edit Ingredient'}
      >
        {editLine && (
          <form onSubmit={handleLineSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Ingredient *
              </label>
              <ComboBox
                required
                value={editLine.ingredient}
                onChange={(v) => setEditLine({ ...editLine, ingredient: v })}
                options={ingredients.map((i) => ({
                  value: i.id,
                  label: `${i.code} — ${i.inci_name}`,
                }))}
                placeholder="Search ingredient…"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Part (Phase)
              </label>
              <input
                value={editLine.phase}
                onChange={(e) =>
                  setEditLine({ ...editLine, phase: e.target.value })
                }
                placeholder="e.g. A, B, C"
                maxLength={32}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                %w/w *
              </label>
              <input
                required
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={editLine.percentage}
                onChange={(e) =>
                  setEditLine({ ...editLine, percentage: e.target.value })
                }
                placeholder="0.0000"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded font-mono"
              />
              {editLine.percentage && batchQtyNum > 0 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Weight: {(batchQtyNum * parseFloat(editLine.percentage || '0') / 100).toFixed(4)} {batchUnit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Comment
              </label>
              <input
                value={editLine.comment}
                onChange={(e) =>
                  setEditLine({ ...editLine, comment: e.target.value })
                }
                placeholder="Optional note"
                maxLength={255}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : editIdx === null ? 'Add' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSlideOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </SlideOver>
    </>
  );
}
