'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { moStatusVariant, poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { clientFetch } from '@/lib/client-api';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type {
  Item,
  ManufacturingOrder,
  ProductionPlan,
  PurchaseOrder,
  SalesOrder,
  Uom,
} from '@/lib/types';

type PlanRow = ProductionPlan & {
  mo_number: string;
  mo_status: string;
  sales_order_number: string | null;
  item_label: string;
  po_number: string | null;
  uom_code: string | null;
};

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatNumber(value: string | null | undefined) {
  if (!value) return '—';
  return Number(value).toLocaleString();
}

function columns(t: (k: string) => string, router: ReturnType<typeof useRouter>): Column<PlanRow>[] {
  return [
    { key: 'plan_date', header: t('Plan Date'), render: (row) => formatDate(row.plan_date), sortable: true },
    { key: 'mo_number', header: t('MO #'), sortable: true },
    {
      key: 'mo_status',
      header: t('MO Status'),
      render: (row) => <Badge variant={moStatusVariant(row.mo_status)}>{row.mo_status}</Badge>,
      sortable: true,
    },
    {
      key: 'sales_order_number',
      header: t('Sales Order'),
      render: (row) => row.sales_order_number ?? '—',
      sortable: true,
    },
    { key: 'item_label', header: t('Finished Good'), sortable: true },
    {
      key: 'planned_qty',
      header: t('Planned Qty'),
      render: (row) => `${formatNumber(row.planned_qty)}${row.uom_code ? ` ${row.uom_code}` : ''}`,
      className: 'tabular-nums whitespace-nowrap',
      sortable: true,
    },
    {
      key: 'po_number',
      header: t('Linked PO'),
      render: (row) => {
        if (!row.po_number) return '—';
        return <Badge variant={poStatusVariant('confirmed')}>{row.po_number}</Badge>;
      },
      sortable: true,
    },
    {
      key: 'notes',
      header: t('Notes'),
      render: (row) => row.notes ?? '—',
    },
    {
      key: 'created_at',
      header: t('Created'),
      render: (row) => formatDate(row.created_at),
      sortable: true,
    },
  ];
}

export default function MrpClient({
  plans,
  mos,
  purchaseOrders,
  salesOrders,
  items,
  uoms,
}: {
  plans: ProductionPlan[];
  mos: ManufacturingOrder[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  items: Item[];
  uoms: Uom[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAppPrefs();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    plan_date: '',
    manufacturing_order_id: '',
    purchase_order_id: '',
    planned_qty: '',
    notes: '',
  });

  useEffect(() => {
    const moId = searchParams.get('mo');
    if (searchParams.get('new') === '1' || moId) {
      setOpen(true);
      if (moId) {
        const targetMo = mos.find((mo) => mo.id === moId);
        setForm((current) => ({
          ...current,
          manufacturing_order_id: moId,
          planned_qty: current.planned_qty || targetMo?.qty_planned || '',
        }));
      }
      router.replace('/mrp', { scroll: false });
    }
  }, [mos, router, searchParams]);

  const moMap = useMemo(
    () => Object.fromEntries(mos.map((mo) => [mo.id, mo])),
    [mos],
  );
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, `${item.item_code} — ${item.description}`])),
    [items],
  );
  const uomMap = useMemo(
    () => Object.fromEntries(uoms.map((uom) => [uom.id, uom.code])),
    [uoms],
  );
  const salesOrderMap = useMemo(
    () => Object.fromEntries(salesOrders.map((order) => [order.id, order.order_number])),
    [salesOrders],
  );
  const purchaseOrderMap = useMemo(
    () => Object.fromEntries(purchaseOrders.map((po) => [po.id, po.po_number])),
    [purchaseOrders],
  );

  const tableRows = useMemo<PlanRow[]>(() => {
    return plans.map((plan) => {
      const mo = moMap[plan.manufacturing_order_id];
      return {
        ...plan,
        mo_number: mo?.mo_number ?? 'Unknown MO',
        mo_status: mo?.status ?? 'draft',
        sales_order_number: mo?.sales_order_id ? salesOrderMap[mo.sales_order_id] ?? null : null,
        item_label: mo ? itemMap[mo.item_id] ?? mo.item_id : 'Unknown item',
        po_number: plan.purchase_order_id ? purchaseOrderMap[plan.purchase_order_id] ?? null : null,
        uom_code: mo ? uomMap[mo.uom_id] ?? null : null,
      };
    });
  }, [itemMap, moMap, plans, purchaseOrderMap, salesOrderMap, uomMap]);

  const activeMos = useMemo(
    () => mos.filter((mo) => mo.status !== 'completed' && mo.status !== 'cancelled'),
    [mos],
  );
  const selectedMo = activeMos.find((mo) => mo.id === form.manufacturing_order_id) ?? null;
  const relatedPurchaseOrders = selectedMo
    ? purchaseOrders.filter((po) => po.manufacturing_order_id === selectedMo.id)
    : purchaseOrders;

  const totalPlannedQty = plans.reduce((sum, plan) => sum + Number(plan.planned_qty ?? 0), 0);
  const upcomingPlans = plans.filter((plan) => {
    const planDate = new Date(plan.plan_date);
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);
    return planDate >= new Date(now.toDateString()) && planDate <= inSevenDays;
  }).length;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clientFetch('/api/v1/production/plans', {
        method: 'POST',
        body: JSON.stringify({
          plan_date: form.plan_date,
          manufacturing_order_id: form.manufacturing_order_id,
          purchase_order_id: form.purchase_order_id || null,
          planned_qty: form.planned_qty || null,
          notes: form.notes || null,
        }),
      });
      setOpen(false);
      setForm({
        plan_date: '',
        manufacturing_order_id: '',
        purchase_order_id: '',
        planned_qty: '',
        notes: '',
      });
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('Total Plans')}</p>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold text-neutral-900">{plans.length}</p>
            <p className="mt-1 text-sm text-neutral-500">Recorded planning runs</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('Planned Volume')}</p>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold text-neutral-900">{totalPlannedQty.toLocaleString()}</p>
            <p className="mt-1 text-sm text-neutral-500">Aggregate planned quantity</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('Due In 7 Days')}</p>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold text-neutral-900">{upcomingPlans}</p>
            <p className="mt-1 text-sm text-neutral-500">Upcoming production commitments</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('Open MOs')}</p>
          </CardHeader>
          <CardBody>
            <p className="text-2xl font-semibold text-neutral-900">{activeMos.length}</p>
            <p className="mt-1 text-sm text-neutral-500">Ready for planning</p>
          </CardBody>
        </Card>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={columns(t, router)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New Plan</Button>}
          data={tableRows}
          onRowClick={(row) => router.push(`/manufacturing-orders/${row.manufacturing_order_id}`)}
          actions={(row) => [
            {
              label: 'Open Manufacturing Order',
              onClick: () => router.push(`/manufacturing-orders/${row.manufacturing_order_id}`),
            },
            {
              label: 'Create Related Plan',
              onClick: () => {
                setForm((current) => ({
                  ...current,
                  manufacturing_order_id: row.manufacturing_order_id,
                  planned_qty: current.planned_qty || row.planned_qty || '',
                }));
                setOpen(true);
              },
            },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Production Plan">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Plan Date</label>
            <input
              required
              type="date"
              value={form.plan_date}
              onChange={(event) => setForm({ ...form, plan_date: event.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Manufacturing Order</label>
            <ComboBox
              required
              value={form.manufacturing_order_id}
              onChange={(v) => {
                const nextMo = activeMos.find((mo) => mo.id === v) ?? null;
                setForm({
                  ...form,
                  manufacturing_order_id: v,
                  purchase_order_id: '',
                  planned_qty: form.planned_qty || nextMo?.qty_planned || '',
                });
              }}
              options={activeMos.map((mo) => ({ value: mo.id, label: `${mo.mo_number} · ${itemMap[mo.item_id] ?? mo.item_id}` }))}
              placeholder="Select MO"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          {selectedMo && (
            <div className="rounded-lg border-[0.5px] border-neutral-200 bg-neutral-50 px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-neutral-900">{selectedMo.mo_number}</p>
                <Badge variant={moStatusVariant(selectedMo.status)}>{selectedMo.status}</Badge>
              </div>
              <p className="mt-2 text-neutral-600">{itemMap[selectedMo.item_id] ?? selectedMo.item_id}</p>
              <p className="mt-1 text-neutral-500">
                Planned {formatNumber(selectedMo.qty_planned)} {uomMap[selectedMo.uom_id] ?? ''}
                {selectedMo.sales_order_id ? ` · SO ${salesOrderMap[selectedMo.sales_order_id] ?? selectedMo.sales_order_id}` : ''}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Linked Purchase Order</label>
            <ComboBox
              value={form.purchase_order_id}
              onChange={(v) => setForm({ ...form, purchase_order_id: v })}
              options={[{ value: '', label: 'No linked PO' }, ...relatedPurchaseOrders.map((po) => ({ value: po.id, label: po.po_number }))]}
              placeholder="No linked PO"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Planned Qty</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={form.planned_qty}
              onChange={(event) => setForm({ ...form, planned_qty: event.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none"
              placeholder="Capacity, sequencing, material risk, or handoff notes"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Plan'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}