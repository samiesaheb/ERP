'use client';

import Badge from '@/components/ui/Badge';
import DataTable, { Column } from '@/components/ui/DataTable';
import type { InventoryWithAlert } from '@/lib/types';

const COLUMNS: Column<InventoryWithAlert>[] = [
  { key: 'item_code', header: 'Code', sortable: true },
  { key: 'item_description', header: 'Description', sortable: true },
  {
    key: 'qty_on_hand',
    header: 'On Hand',
    sortable: true,
    className: 'tabular-nums',
    render: (row) => Number(row.qty_on_hand).toLocaleString(),
  },
  {
    key: 'qty_reserved',
    header: 'Reserved',
    className: 'tabular-nums',
    render: (row) => Number(row.qty_reserved).toLocaleString(),
  },
  {
    key: 'qty_available',
    header: 'Available',
    sortable: true,
    className: 'tabular-nums font-medium',
    render: (row) => Number(row.qty_available).toLocaleString(),
  },
  {
    key: 'low_stock',
    header: 'Alert',
    render: (row) => (row.low_stock ? <Badge variant="red">Low Stock</Badge> : <Badge variant="green">OK</Badge>),
  },
  {
    key: 'updated_at',
    header: 'Updated',
    sortable: true,
    render: (row) => new Date(row.updated_at).toLocaleDateString(),
  },
];

export default function InventoryClient({ inventory }: { inventory: InventoryWithAlert[] }) {
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
      <DataTable columns={COLUMNS} data={inventory} />
    </div>
  );
}