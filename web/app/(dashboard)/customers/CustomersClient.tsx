'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import Badge from '@/components/ui/Badge';
import { clientFetch } from '@/lib/client-api';
import type { Customer, CustomerType, Country } from '@/lib/types';

interface Props {
  customers:     Customer[];
  customerTypes: CustomerType[];
  countries:     Country[];
  typeMap:       Record<string, string>;
  countryMap:    Record<string, string>;
}

const COLUMNS = (
  typeMap: Record<string, string>,
  countryMap: Record<string, string>,
): Column<Customer>[] => [
  { key: 'name',             header: 'Name',    sortable: true },
  { key: 'customer_type_id', header: 'Type',    sortable: true,
    render: (r) => <Badge variant="blue">{typeMap[r.customer_type_id] ?? '—'}</Badge> },
  { key: 'country_id',       header: 'Country', sortable: true,
    render: (r) => countryMap[r.country_id] ?? '—' },
  { key: 'email',            header: 'Email',
    render: (r) => r.email ?? '—' },
  { key: 'phone',            header: 'Phone',
    render: (r) => r.phone ?? '—' },
  { key: 'created_at',       header: 'Created', sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString() },
];

interface Form {
  name:             string;
  customer_type_id: string;
  country_id:       string;
  email:            string;
  phone:            string;
  address:          string;
}

const EMPTY: Form = {
  name:             '',
  customer_type_id: '',
  country_id:       '',
  email:            '',
  phone:            '',
  address:          '',
};

export default function CustomersClient({
  customers, customerTypes, countries, typeMap, countryMap,
}: Props) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          name:             form.name,
          customer_type_id: form.customer_type_id,
          country_id:       form.country_id,
          email:            form.email   || null,
          phone:            form.phone   || null,
          address:          form.address || null,
        }),
      });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-start mb-3">
        <Button onClick={() => setOpen(true)}>+ New Customer</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(typeMap, countryMap)}
          data={customers}
          searchable
          actions={(row) => [
            { label: 'View Sales Orders', onClick: () => router.push('/sales-orders') },
            { label: 'Create Invoice',    onClick: () => router.push('/invoicing?new=1') },
            { label: 'New Shipment',      onClick: () => router.push('/shipments') },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Customer">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Customer Type</label>
            <select
              required
              value={form.customer_type_id}
              onChange={(e) => set('customer_type_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            >
              <option value="">Select type</option>
              {customerTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
            <select
              required
              value={form.country_id}
              onChange={(e) => set('country_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Customer'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
