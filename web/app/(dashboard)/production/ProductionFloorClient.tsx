'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Badge, { batchStatusVariant } from '@/components/ui/Badge';
import type { ProductionBatch } from '@/lib/types';

const STAGE_ORDER: Record<string, number> = {
  bulk: 1, formulation: 2, filling: 3, packing: 4, loading: 5,
};

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-neutral-400';
  return (
    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function BatchCard({ batch, moMap }: { batch: ProductionBatch; moMap: Record<string, string> }) {
  const pct = Number(batch.pct_complete);
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-neutral-500">{batch.batch_number}</p>
          <p className="text-sm font-medium text-neutral-800 mt-0.5">
            {moMap[batch.mo_id] ?? batch.mo_id}
          </p>
        </div>
        <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-20 capitalize">{batch.stage}</span>
        <div className="flex-1">
          <ProgressBar pct={pct} />
        </div>
        <span className="text-xs font-semibold tabular-nums w-10 text-right">{pct}%</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {['bulk', 'formulation', 'filling', 'packing', 'loading'].map((s) => {
          const stageNum = STAGE_ORDER[s];
          const currentNum = STAGE_ORDER[batch.stage] ?? 0;
          const done = stageNum < currentNum;
          const active = s === batch.stage;
          return (
            <span
              key={s}
              className={`text-[10px] px-1.5 py-0.5 rounded capitalize
                ${active ? 'bg-neutral-900 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}
            >
              {s}
            </span>
          );
        })}
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

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [router]);

  if (batches.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm">
        No active batches on the floor
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {batches.map((batch) => (
        <BatchCard key={batch.id} batch={batch} moMap={moMap} />
      ))}
    </div>
  );
}
