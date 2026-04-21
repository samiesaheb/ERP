'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DropdownMenu from '@/components/ui/DropdownMenu';
import SlideOver from '@/components/ui/SlideOver';
import type { ProductionBatch } from '@/lib/types';
import { updateProductionBatchStatus } from '@/lib/mutations';
import { clientFetch } from '@/lib/client-api';

const STATUS_ORDER: Record<string, number> = {
  planned: 1, bulk_production: 2, filling: 3, packing: 4, completed: 5,
};

function StatusPip({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize
      ${active ? 'bg-neutral-900 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
      {label.replace('_', ' ')}
    </span>
  );
}

const NEXT_STAGE: Record<string, string> = {
  planned:         'bulk_production',
  bulk_production: 'filling',
  filling:         'packing',
  packing:         'completed',
};

function BatchCard({ batch, moMap, highlighted, onAdvance, onLogQc, onLogDowntime }: {
  batch: ProductionBatch;
  moMap: Record<string, string>;
  highlighted: boolean;
  onAdvance: (batchId: string, nextStatus: string) => Promise<void>;
  onLogQc: (batch: ProductionBatch) => void;
  onLogDowntime: (batch: ProductionBatch) => void;
}) {
  const router = useRouter();   // ← fix: useRouter inside the card
  const ref    = useRef<HTMLDivElement>(null);
  const stages    = ['planned', 'bulk_production', 'filling', 'packing', 'completed'];
  const currentIdx = STATUS_ORDER[batch.status] ?? 0;
  const nextStage  = NEXT_STAGE[batch.status];

  // Scroll into view when highlighted via ?batch= param
  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <div
      ref={ref}
      className={`bg-white border rounded-xl p-4 space-y-3 transition-shadow ${
        highlighted
          ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900'
          : 'border-neutral-200 border-[0.5px]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-neutral-500">{batch.batch_number}</p>
          <p className="text-sm font-medium text-neutral-800 mt-0.5">
            {moMap[batch.manufacturing_order_id] ?? batch.manufacturing_order_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={batch.status === 'completed' ? 'green' : batch.status === 'planned' ? 'gray' : 'blue'}>
            {batch.status.replace('_', ' ')}
          </Badge>
          <DropdownMenu items={[
            ...(nextStage ? [{ label: 'Advance Stage', onClick: () => onAdvance(batch.id, nextStage) }] : []),
            { label: 'Log QC Test',   onClick: () => onLogQc(batch) },
            { label: 'Log Downtime',  onClick: () => onLogDowntime(batch) },
            { label: 'View MO',       onClick: () => router.push(`/manufacturing-orders/${batch.manufacturing_order_id}`) },
          ]} />
        </div>
      </div>

      {batch.qty_bulk_produced && (
        <p className="text-xs text-neutral-500">
          Bulk: <span className="font-semibold">{Number(batch.qty_bulk_produced).toLocaleString()}</span>
          {batch.qty_filled && <> · Filled: <span className="font-semibold">{Number(batch.qty_filled).toLocaleString()}</span></>}
          {batch.qty_packed && <> · Packed: <span className="font-semibold">{Number(batch.qty_packed).toLocaleString()}</span></>}
        </p>
      )}

      <p className="text-[10px] text-neutral-400">
        Created {new Date(batch.created_at).toLocaleDateString()}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {stages.map((s) => (
          <StatusPip
            key={s}
            label={s}
            active={s === batch.status}
            done={STATUS_ORDER[s] < currentIdx}
          />
        ))}
      </div>
    </div>
  );
}

const QC_TYPES = ['viscosity', 'ph', 'microbial', 'temperature', 'appearance', 'weight', 'other'];
const DOWNTIME_CODES = ['mechanical', 'cleaning', 'setup', 'material_shortage', 'operator', 'quality_hold', 'other'];

export default function ProductionFloorClient({
  batches,
  moMap,
}: {
  batches: ProductionBatch[];
  moMap: Record<string, string>;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const highlightId  = searchParams.get('batch');
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  // QC test slide-over
  const [qcBatch,   setQcBatch]   = useState<ProductionBatch | null>(null);
  const [qcForm,    setQcForm]    = useState({ test_type: 'ph', result_value: '', min_spec: '', max_spec: '', pass_fail: 'pending', notes: '' });
  const [qcSaving,  setQcSaving]  = useState(false);
  const [qcError,   setQcError]   = useState('');

  // Downtime slide-over
  const [dtBatch,   setDtBatch]   = useState<ProductionBatch | null>(null);
  const [dtForm,    setDtForm]    = useState({ reason_code: 'mechanical', description: '' });
  const [dtSaving,  setDtSaving]  = useState(false);
  const [dtError,   setDtError]   = useState('');

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleAdvance(batchId: string, nextStatus: string) {
    setAdvanceError(null);
    try {
      await updateProductionBatchStatus(batchId, nextStatus);
      router.refresh();
    } catch (err) {
      setAdvanceError(err instanceof Error ? err.message : 'Failed to advance stage');
    }
  }

  async function handleQcSubmit() {
    if (!qcBatch) return;
    setQcError('');
    setQcSaving(true);
    try {
      await clientFetch(`/api/v1/production/batches/${qcBatch.id}/qc-tests`, {
        method: 'POST',
        body: JSON.stringify({
          test_type:    qcForm.test_type,
          result_value: qcForm.result_value || null,
          min_spec:     qcForm.min_spec     || null,
          max_spec:     qcForm.max_spec     || null,
          pass_fail:    qcForm.pass_fail,
          notes:        qcForm.notes        || null,
        }),
      });
      setQcBatch(null);
      router.refresh();
    } catch (err) {
      setQcError(err instanceof Error ? err.message : 'Failed to save QC test');
    } finally {
      setQcSaving(false);
    }
  }

  async function handleDtSubmit() {
    if (!dtBatch) return;
    setDtError('');
    setDtSaving(true);
    try {
      await clientFetch(`/api/v1/production/batches/${dtBatch.id}/downtime`, {
        method: 'POST',
        body: JSON.stringify({
          reason_code: dtForm.reason_code,
          description: dtForm.description || null,
        }),
      });
      setDtBatch(null);
      router.refresh();
    } catch (err) {
      setDtError(err instanceof Error ? err.message : 'Failed to log downtime');
    } finally {
      setDtSaving(false);
    }
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm">
        No active batches on the floor
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {advanceError && (
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {advanceError}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              moMap={moMap}
              highlighted={batch.id === highlightId}
              onAdvance={handleAdvance}
              onLogQc={(b) => { setQcBatch(b); setQcForm({ test_type: 'ph', result_value: '', min_spec: '', max_spec: '', pass_fail: 'pending', notes: '' }); setQcError(''); }}
              onLogDowntime={(b) => { setDtBatch(b); setDtForm({ reason_code: 'mechanical', description: '' }); setDtError(''); }}
            />
          ))}
        </div>
      </div>

      {/* QC Test Slide-Over */}
      <SlideOver open={!!qcBatch} onClose={() => setQcBatch(null)}
        title={`Log QC Test — ${qcBatch?.batch_number ?? ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Test Type</label>
            <ComboBox
              freeform
              value={qcForm.test_type}
              onChange={(v) => setQcForm((f) => ({ ...f, test_type: v }))}
              options={QC_TYPES.map((t) => ({ value: t, label: t }))}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Result Value</label>
            <input className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={qcForm.result_value}
              onChange={(e) => setQcForm((f) => ({ ...f, result_value: e.target.value }))}
              placeholder="e.g. 6.8 or Cream-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Min Spec</label>
              <input type="number" step="any"
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={qcForm.min_spec}
                onChange={(e) => setQcForm((f) => ({ ...f, min_spec: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Max Spec</label>
              <input type="number" step="any"
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
                value={qcForm.max_spec}
                onChange={(e) => setQcForm((f) => ({ ...f, max_spec: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Pass / Fail</label>
            <ComboBox
              value={qcForm.pass_fail}
              onChange={(v) => setQcForm((f) => ({ ...f, pass_fail: v }))}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'pass',    label: 'Pass' },
                { value: 'fail',    label: 'Fail' },
              ]}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea rows={2}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={qcForm.notes}
              onChange={(e) => setQcForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          {qcError && <p className="text-xs text-red-600">{qcError}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleQcSubmit} disabled={qcSaving}>
              {qcSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setQcBatch(null)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>

      {/* Downtime Slide-Over */}
      <SlideOver open={!!dtBatch} onClose={() => setDtBatch(null)}
        title={`Log Downtime — ${dtBatch?.batch_number ?? ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Reason Code</label>
            <ComboBox
              freeform
              value={dtForm.reason_code}
              onChange={(v) => setDtForm((f) => ({ ...f, reason_code: v }))}
              options={DOWNTIME_CODES.map((c) => ({ value: c, label: c.replace('_', ' ') }))}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <textarea rows={3}
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={dtForm.description}
              onChange={(e) => setDtForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the issue" />
          </div>
          {dtError && <p className="text-xs text-red-600">{dtError}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleDtSubmit} disabled={dtSaving}>
              {dtSaving ? 'Logging…' : 'Log Downtime'}
            </Button>
            <Button variant="secondary" onClick={() => setDtBatch(null)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
