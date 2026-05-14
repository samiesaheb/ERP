'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import Badge from '@/components/ui/Badge';
import { clientFetch } from '@/lib/client-api';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { Customer, CustomerType, Country } from '@/lib/types';

interface Props {
  customers:     Customer[];
  customerTypes: CustomerType[];
  countries:     Country[];
  typeMap:       Record<string, string>;
  countryMap:    Record<string, string>;
}

const COLUMNS = (
  t: (k: string) => string,
  typeMap: Record<string, string>,
  countryMap: Record<string, string>,
): Column<Customer>[] => [
  { key: 'name',             header: t('Name'),    sortable: true },
  { key: 'customer_type_id', header: t('Type'),    sortable: true,
    render: (r) => <Badge variant="blue">{typeMap[r.customer_type_id] ?? '—'}</Badge> },
  { key: 'country_id',       header: t('Country'), sortable: true,
    render: (r) => countryMap[r.country_id] ?? '—' },
  { key: 'email',            header: t('Email'),
    render: (r) => r.email ?? '—' },
  { key: 'phone',            header: t('Phone'),
    render: (r) => r.phone ?? '—' },
  { key: 'created_at',       header: t('Created'), sortable: true,
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
  const { t } = useAppPrefs();
  const [open,           setOpen]           = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form,           setForm]           = useState<Form>(EMPTY);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openCreate() {
    setEditingCustomer(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name:             customer.name,
      customer_type_id: customer.customer_type_id,
      country_id:       customer.country_id,
      email:            customer.email ?? '',
      phone:            customer.phone ?? '',
      address:          customer.address ?? '',
    });
    setError('');
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name:             form.name,
        customer_type_id: form.customer_type_id,
        country_id:       form.country_id,
        email:            form.email   || null,
        phone:            form.phone   || null,
        address:          form.address || null,
      };
      if (editingCustomer) {
        await clientFetch(`/api/v1/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await clientFetch('/api/v1/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
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
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(t, typeMap, countryMap)}
          toolbar={<Button onClick={openCreate}>+ New Customer</Button>}
          data={customers}
          searchable
          onRowClick={(row) => openEdit(row)}
          actions={(row) => [
            { label: 'Edit',              onClick: () => openEdit(row) },
            { label: 'View Sales Orders', onClick: () => router.push('/sales-orders') },
            { label: 'Create Invoice',    onClick: () => router.push('/invoicing?new=1') },
            { label: 'New Shipment',      onClick: () => router.push('/shipments') },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editingCustomer ? editingCustomer.name : 'New Customer'}>
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
            <ComboBox
              required
              value={form.customer_type_id}
              onChange={(v) => set('customer_type_id', v)}
              options={customerTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select type"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
            <ComboBox
              required
              value={form.country_id}
              onChange={(v) => set('country_id', v)}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select country"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
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
              {loading
                ? (editingCustomer ? 'Saving…' : 'Creating…')
                : (editingCustomer ? 'Save Changes' : 'Create Customer')}
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
