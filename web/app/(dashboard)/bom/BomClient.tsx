'use client';

import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import DataTable, { Column } from '@/components/ui/DataTable';
import type { Bom } from '@/lib/types';

const COLUMNS = (itemMap: Record<string, string>): Column<Bom>[] => [
  {
    key: 'code',
    header: 'BOM Code',
    sortable: true,
    render: (row) => (
      <Link href={`/bom/${row.id}`} className="text-blue-600 hover:underline font-mono text-xs">
        {row.code}
      </Link>
    ),
  },
  {
    key: 'item_id',
    header: 'Finished Good',
    render: (row) => itemMap[row.item_id] ?? row.item_id,
  },
  {
    key: 'version',
    header: 'Version',
    sortable: true,
    render: (row) => `v${row.version}`,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.status === 'active' ? 'green' : row.status === 'draft' ? 'amber' : 'blue'}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function BomClient({
  boms,
  itemMap,
}: {
  boms: Bom[];
  itemMap: Record<string, string>;
}) {
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
      <DataTable columns={COLUMNS(itemMap)} data={boms} />
    </div>
  );
}