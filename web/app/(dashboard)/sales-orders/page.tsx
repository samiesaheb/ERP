import { getSalesOrders, getCustomers, getCountries } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import SalesOrdersClient from './SalesOrdersClient';

export default async function SalesOrdersPage() {
  const [orders, customers, countries] = await Promise.all([
    getSalesOrders(),
    getCustomers(),
    getCountries(),
  ]);
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  return (
    <div>
      <Topbar title="Sales Orders" />
      <div className="px-6 py-5">
        <SalesOrdersClient
          orders={orders}
          customerMap={customerMap}
          customers={customers}
          countries={countries}
        />
      </div>
    </div>
  );
}
