'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import DropdownMenu from '@/components/ui/DropdownMenu';
import type { ProductionBatch } from '@/lib/types';
import { updateProductionBatchStatus } from '@/lib/mutations';

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

function BatchCard({ batch, moMap, onAdvance }: {
  batch: ProductionBatch;
  moMap: Record<string, string>;
  onAdvance: (batchId: string, nextStatus: string) => Promise<void>;
}) {
  const stages = ['planned', 'bulk_production', 'filling', 'packing', 'completed'];
  const currentIdx = STATUS_ORDER[batch.status] ?? 0;
  const nextStage = NEXT_STAGE[batch.status];

  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl p-4 space-y-3">
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

export default function ProductionFloorClient({
  batches,
  moMap,
}: {
  batches: ProductionBatch[];
  moMap: Record<string, string>;
}) {
  const router = useRouter();
  const [advanceError, setAdvanceError] = useState<string | null>(null);

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

  if (batches.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm">
        No active batches on the floor
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {advanceError && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {advanceError}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {batches.map((batch) => (
          <BatchCard key={batch.id} batch={batch} moMap={moMap} onAdvance={handleAdvance} />
        ))}
      </div>
    </div>
  );
}
