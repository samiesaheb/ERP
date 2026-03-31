import { getSuppliers, getCountries } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import SuppliersClient from './SuppliersClient';

export default async function SuppliersPage() {
  const [suppliers, countries] = await Promise.all([getSuppliers(), getCountries()]);
  const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

  return (
    <div>
      <Topbar title="Suppliers" />
      <div className="px-6 py-5">
        <SuppliersClient suppliers={suppliers} countryMap={countryMap} />
      </div>
    </div>
  );
}
