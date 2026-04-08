'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Country, Supplier } from '@/lib/types';

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
  { key: 'email', header: 'Email', render: (row) => row.email ?? '—' },
  { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '—' },
  {
    key: 'payment_terms',
    header: 'Payment Terms',
    render: (row) => row.payment_terms ?? '—',
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function SuppliersClient({
  suppliers,
  countries,
  countryMap,
}: {
  suppliers: Supplier[];
  countries: Country[];
  countryMap: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name:          '',
    country_id:    '',
    supplier_type: 'local',
    email:         '',
    phone:         '',
    address:       '',
    payment_terms: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        email:         form.email         || null,
        phone:         form.phone         || null,
        address:       form.address       || null,
        payment_terms: form.payment_terms || null,
      };
      await clientFetch('/api/v1/suppliers', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      setForm({ name: '', country_id: '', supplier_type: 'local', email: '', phone: '', address: '', payment_terms: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)}>+ New Supplier</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(countryMap)}
          data={suppliers}
          actions={() => [
            { label: 'Edit',       onClick: () => setOpen(true) },
            { label: 'View Items', onClick: () => router.push('/items') },
            { label: 'Create PO',  onClick: () => router.push('/purchase-orders?new=1') },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Supplier">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Supplier name"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
            <select required value={form.country_id} onChange={(e) => setForm({ ...form, country_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select country…</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
            <select value={form.supplier_type} onChange={(e) => setForm({ ...form, supplier_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Payment Terms</label>
            <input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
              placeholder="e.g. Net 30"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create Supplier'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
