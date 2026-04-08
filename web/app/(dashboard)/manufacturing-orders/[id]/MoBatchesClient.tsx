'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge, { batchStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { clientFetch } from '@/lib/client-api';
import type { ProductionBatch } from '@/lib/types';

interface Props {
  moId:   string;
  batches: ProductionBatch[];
  uomMap: Record<string, string>;
}

function fmt(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString() : '—';
}

function qty(v: string | null | undefined, uom: string) {
  if (!v) return '—';
  return `${Number(v).toLocaleString()} ${uom}`;
}

export default function MoBatchesClient({ moId, batches, uomMap }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setError('');
    setCreating(true);
    try {
      await clientFetch(`/api/v1/manufacturing-orders/${moId}/batches`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Production Batches
        </p>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating…' : '+ Create Batch'}
        </Button>
      </CardHeader>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b-[0.5px] border-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        {batches.length === 0 ? (
          <CardBody className="text-sm text-neutral-400">
            No batches yet — create a batch to start production.
          </CardBody>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                {['Batch #', 'Status', 'Bulk Produced', 'Filled', 'Packed', 'Created'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const uom = uomMap[batch.uom_id] ?? '';
                return (
                  <tr
                    key={batch.id}
                    className="border-b-[0.5px] border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer"
                    onClick={() => router.push(`/production?batch=${batch.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{batch.batch_number}</td>
                    <td className="px-4 py-3">
                      <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{qty(batch.qty_bulk_produced, uom)}</td>
                    <td className="px-4 py-3 tabular-nums">{qty(batch.qty_filled, uom)}</td>
                    <td className="px-4 py-3 tabular-nums">{qty(batch.qty_packed, uom)}</td>
                    <td className="px-4 py-3 text-neutral-500">{fmt(batch.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/production?batch=${batch.id}`);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View on Floor →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
