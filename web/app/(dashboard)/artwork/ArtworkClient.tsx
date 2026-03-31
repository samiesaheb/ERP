'use client';

import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import type { SalesOrder } from '@/lib/types';

const COLUMNS: Column<SalesOrder>[] = [
  { key: 'order_number', header: 'SO #', sortable: true },
  {
    key: 'artwork_status',
    header: 'Artwork Status',
    sortable: true,
    render: (r) => (
      <Badge
        variant={
          r.artwork_status === 'approved'
            ? 'green'
            : r.artwork_status === 'in_review'
            ? 'amber'
            : 'gray'
        }
      >
        {r.artwork_status}
      </Badge>
    ),
  },
  {
    key: 'fda_required',
    header: 'FDA Required',
    render: (r) =>
      r.fda_required ? (
        <Badge variant={r.fda_status === 'approved' ? 'green' : 'amber'}>
          {r.fda_status ?? 'pending'}
        </Badge>
      ) : (
        <span className="text-neutral-400 text-xs">—</span>
      ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export default function ArtworkClient({ orders }: { orders: SalesOrder[] }) {
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
      <DataTable columns={COLUMNS} data={orders} />
    </div>
  );
}
