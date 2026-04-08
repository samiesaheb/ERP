import { getPayments, getCustomers, getSuppliers, getInvoices, getPurchaseOrders } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import PaymentsClient from './PaymentsClient';

export default async function PaymentsPage() {
  const [payments, customers, suppliers, invoices, purchaseOrders] = await Promise.all([
    getPayments(),
    getCustomers(),
    getSuppliers(),
    getInvoices(),
    getPurchaseOrders(),
  ]);

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  return (
    <div>
      <Topbar title="Payments" />
      <div className="px-6 py-5">
        <PaymentsClient
          payments={payments}
          customers={customers}
          suppliers={suppliers}
          invoices={invoices}
          purchaseOrders={purchaseOrders}
          customerMap={customerMap}
          supplierMap={supplierMap}
        />
      </div>
    </div>
  );
}
