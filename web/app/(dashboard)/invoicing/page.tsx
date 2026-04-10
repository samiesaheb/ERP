import { getInvoices, getCustomers, getSalesOrders, getShipments } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import InvoicingClient from './InvoicingClient';

export default async function InvoicingPage() {
  const [invoices, customers, sos, shipments] = await Promise.all([
    getInvoices(),
    getCustomers(),
    getSalesOrders(),
    getShipments(),
  ]);
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const soMap = Object.fromEntries(sos.map((s) => [s.id, s.order_number]));
  return (
    <div>
      <Topbar title="Invoicing" />
      <div className="px-6 py-5">
        <InvoicingClient invoices={invoices} customerMap={customerMap} soMap={soMap} customers={customers} salesOrders={sos} shipments={shipments} />
      </div>
    </div>
  );
}
