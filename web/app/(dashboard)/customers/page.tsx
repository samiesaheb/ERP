import { getCustomers, getCustomerTypes, getCountries } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  const [customers, customerTypes, countries] = await Promise.all([
    getCustomers(),
    getCustomerTypes(),
    getCountries(),
  ]);

  const typeMap    = Object.fromEntries(customerTypes.map((t) => [t.id, t.name]));
  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div>
      <Topbar title="Customers" />
      <div className="px-6 py-5">
        <CustomersClient
          customers={customers}
          customerTypes={customerTypes}
          countries={countries}
          typeMap={typeMap}
          countryMap={countryMap}
        />
      </div>
    </div>
  );
}
