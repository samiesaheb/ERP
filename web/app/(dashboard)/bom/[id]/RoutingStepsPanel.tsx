'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { RoutingStep, WorkCenter } from '@/lib/types';

interface Props {
  bomId:        string;
  steps:        RoutingStep[];
  workCenters:  WorkCenter[];
}

export default function RoutingStepsPanel({ bomId, steps, workCenters }: Props) {
  const router = useRouter();
  const wcMap  = Object.fromEntries(workCenters.map((w) => [w.id, w]));

  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState({ step_number: '', name: '', work_center_id: '', std_time_min: '', instructions: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAdd() {
    setError('');
    setSaving(true);
    try {
      await clientFetch(`/api/v1/boms/${bomId}/routing`, {
        method: 'POST',
        body: JSON.stringify({
          step_number:    Number(form.step_number),
          name:           form.name,
          work_center_id: form.work_center_id,
          std_time_min:   Number(form.std_time_min) || 0,
          instructions:   form.instructions || null,
        }),
      });
      setOpen(false);
      setForm({ step_number: '', name: '', work_center_id: '', std_time_min: '', instructions: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add step');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(stepId: string) {
    setDeleting(stepId);
    try {
      await clientFetch(`/api/v1/boms/${bomId}/routing/${stepId}`, { method: 'DELETE' });
      router.refresh();
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Routing / Process Steps
          </p>
          <Button variant="secondary" size="sm"
            onClick={() => { setForm({ step_number: String(steps.length + 1), name: '', work_center_id: workCenters[0]?.id ?? '', std_time_min: '', instructions: '' }); setError(''); setOpen(true); }}>
            + Add Step
          </Button>
        </CardHeader>

        {steps.length === 0 ? (
          <CardBody className="text-sm text-neutral-400">
            No routing steps defined. Add steps to define the production path for this BOM.
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  {['Step', 'Name', 'Work Center', 'Std Time (min)', 'Instructions', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => {
                  const wc = wcMap[step.work_center_id];
                  return (
                    <tr key={step.id} className="border-b-[0.5px] border-neutral-100 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{String(step.step_number).padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-medium">{step.name}</td>
                      <td className="px-4 py-3">
                        {wc ? (
                          <div>
                            <p className="font-medium">{wc.name}</p>
                            <p className="text-xs text-neutral-400">{wc.center_type}</p>
                          </div>
                        ) : step.work_center_id}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{Number(step.std_time_min).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 max-w-xs truncate">
                        {step.instructions ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(step.id)}
                          disabled={deleting === step.id}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Add Routing Step">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Step #</label>
              <input type="number" min={1}
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={form.step_number}
                onChange={(e) => set('step_number', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Std Time (min)</label>
              <input type="number" min={0} step="any"
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={form.std_time_min}
                onChange={(e) => set('std_time_min', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Step Name *</label>
            <input className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Mixing & Emulsification" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Work Center *</label>
            {workCenters.length === 0 ? (
              <p className="text-xs text-amber-600">No work centers defined yet. Create one at Production → Work Centers first.</p>
            ) : (
              <select className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={form.work_center_id}
                onChange={(e) => set('work_center_id', e.target.value)}>
                <option value="">Select…</option>
                {workCenters.map((wc) => (
                  <option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Instructions</label>
            <textarea rows={3}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="Digital work instructions for the operator" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleAdd}
              disabled={saving || !form.name || !form.work_center_id || !form.step_number}>
              {saving ? 'Saving…' : 'Add Step'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
