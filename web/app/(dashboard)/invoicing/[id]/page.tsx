import { getInvoice, getInvoiceLines, getCustomers, getSalesOrders, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';
import InvoiceDetailClient from './InvoiceDetailClient';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, lines, customers, salesOrders, items, uoms] = await Promise.all([
    getInvoice(id),
    getInvoiceLines(id),
    getCustomers(),
    getSalesOrders(),
    getItems(),
    getUoms(),
  ]);

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const soMap       = Object.fromEntries(salesOrders.map((s) => [s.id, s.order_number]));
  const itemMap     = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));
  const uomMap      = Object.fromEntries(uoms.map((u) => [u.id, u.code]));

  return (
    <div>
      <Topbar
        title={invoice.invoice_number}
        action={
          <Link href="/invoicing" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back to Invoices
          </Link>
        }
      />
      <div className="px-6 py-5">
        <InvoiceDetailClient
          invoice={invoice}
          lines={lines}
          customerMap={customerMap}
          soMap={soMap}
          items={items}
          itemMap={itemMap}
          uoms={uoms}
          uomMap={uomMap}
        />
      </div>
    </div>
  );
}
