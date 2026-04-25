'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
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

interface Form {
  name:          string;
  country_id:    string;
  supplier_type: string;
  email:         string;
  phone:         string;
  address:       string;
  payment_terms: string;
}

const EMPTY: Form = {
  name:          '',
  country_id:    '',
  supplier_type: 'local',
  email:         '',
  phone:         '',
  address:       '',
  payment_terms: '',
};

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
  const [open,            setOpen]            = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form,            setForm]            = useState<Form>(EMPTY);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  function openCreate() {
    setEditingSupplier(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name:          supplier.name,
      country_id:    supplier.country_id,
      supplier_type: supplier.supplier_type,
      email:         supplier.email         ?? '',
      phone:         supplier.phone         ?? '',
      address:       supplier.address       ?? '',
      payment_terms: supplier.payment_terms ?? '',
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
        name:          form.name,
        supplier_type: form.supplier_type,
        country_id:    form.country_id,
        email:         form.email         || null,
        phone:         form.phone         || null,
        address:       form.address       || null,
        payment_terms: form.payment_terms || null,
      };
      if (editingSupplier) {
        await clientFetch(`/api/v1/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await clientFetch('/api/v1/suppliers', { method: 'POST', body: JSON.stringify(payload) });
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
          columns={COLUMNS(countryMap)}
          toolbar={<Button onClick={openCreate}>+ New Supplier</Button>}
          data={suppliers}
          onRowClick={(row) => openEdit(row)}
          actions={(row) => [
            { label: 'Edit',       onClick: () => openEdit(row) },
            { label: 'View Items', onClick: () => router.push('/items') },
            { label: 'Create PO',  onClick: () => router.push('/purchase-orders?new=1') },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editingSupplier ? editingSupplier.name : 'New Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Supplier name"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Country</label>
            <ComboBox
              required
              value={form.country_id}
              onChange={(v) => setForm({ ...form, country_id: v })}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select country…"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Type</label>
            <ComboBox
              freeform
              value={form.supplier_type}
              onChange={(v) => setForm({ ...form, supplier_type: v })}
              options={[
                { value: 'local',         label: 'Local' },
                { value: 'international', label: 'International' },
              ]}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? (editingSupplier ? 'Saving…' : 'Creating…')
                : (editingSupplier ? 'Save Changes' : 'Create Supplier')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
