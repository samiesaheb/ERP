'use client';

import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';
import Button from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import type { BomExplosionResult } from '@/lib/types';

export default function BomExplosionPanel({ bomId }: { bomId: string }) {
  const [result, setResult] = useState<BomExplosionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qty, setQty] = useState('1000');

  async function check() {
    setError('');
    setLoading(true);
    try {
      const data = await clientFetch<BomExplosionResult>(
        `/api/v1/boms/${bomId}/explode?target_qty=${qty}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Material Requirements (BOM Explosion)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-24 px-2 py-1 text-xs border-[0.5px] border-neutral-300 rounded"
              placeholder="Target qty"
            />
            <Button size="sm" onClick={check} disabled={loading}>
              {loading ? 'Checking…' : 'Check Availability'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {error && (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b-[0.5px] border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                {['Component', 'Required', 'On Hand', 'Available', 'UOM', 'Shortfall'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => {
                const hasShortfall = Number(line.shortfall) > 0;
                return (
                  <tr
                    key={line.item_id}
                    className={`border-b-[0.5px] border-neutral-100 ${hasShortfall ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{line.item_code}</p>
                      <p className="text-xs text-neutral-500">{line.description}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.required_qty).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.on_hand).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.available).toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-500">{line.uom}</td>
                    <td className={`px-4 py-3 tabular-nums font-medium ${hasShortfall ? 'text-red-600' : 'text-green-600'}`}>
                      {hasShortfall ? `-${Number(line.shortfall).toLocaleString()}` : '✓'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
