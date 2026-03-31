'use client';

import Badge from '@/components/ui/Badge';
import DataTable, { Column } from '@/components/ui/DataTable';
import type { Supplier } from '@/lib/types';

const COLUMNS = (countryMap: Record<string, string>): Column<Supplier>[] => [
  { key: 'name', header: 'Name', sortable: true },
  {
    key: 'country_id',
    header: 'Country',
    sortable: true,
    render: (row) => countryMap[row.country_id] ?? '—',
  },
  {
    key: 'supplier_type',
    header: 'Type',
    render: (row) => (
      <Badge variant={row.supplier_type === 'international' ? 'blue' : 'green'}>
        {row.supplier_type}
      </Badge>
    ),
  },
  { key: 'category', header: 'Category' },
  {
    key: 'lead_time_days',
    header: 'Lead Time',
    sortable: true,
    render: (row) => `${row.lead_time_days}d`,
  },
  {
    key: 'is_active',
    header: 'Active',
    render: (row) => (
      <Badge variant={row.is_active ? 'green' : 'gray'}>
        {row.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];

export default function SuppliersClient({
  suppliers,
  countryMap,
}: {
  suppliers: Supplier[];
  countryMap: Record<string, string>;
}) {
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
      <DataTable columns={COLUMNS(countryMap)} data={suppliers} />
    </div>
  );
}