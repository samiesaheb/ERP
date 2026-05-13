import { getFormulations, getFormulationProducts } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import FormulationsClient from './FormulationsClient';

export default async function FormulationsPage() {
  const [formulations, products] = await Promise.all([
    getFormulations(),
    getFormulationProducts(),
  ]);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  return (
    <div>
      <Topbar title="Formulations" />
      <div className="px-6 py-5">
        <FormulationsClient
          formulations={formulations}
          products={products}
          productMap={productMap}
        />
      </div>
    </div>
  );
}
