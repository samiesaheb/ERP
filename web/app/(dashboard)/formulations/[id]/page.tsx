import { getFormulation, getIngredients, getFormulationProducts } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';
import FormulationDetailClient from './FormulationDetailClient';

export default async function FormulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [formulation, ingredients, products] = await Promise.all([
    getFormulation(id),
    getIngredients(),
    getFormulationProducts(),
  ]);

  const total = (formulation.lines ?? []).reduce(
    (s, l) => s + parseFloat(l.percentage || '0'),
    0,
  );
  const totalOk = Math.abs(total - 100) < 0.01;

  return (
    <div>
      <Topbar
        title={
          formulation.product_detail
            ? `${formulation.product_detail.name} v${formulation.version}`
            : `Formulation v${formulation.version}`
        }
        action={
          <Link
            href="/formulations"
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            ← Back to Formulations
          </Link>
        }
      />

      <div className="px-6 py-5 space-y-4">
        {/* Header info */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-neutral-500">Product</p>
              <p className="font-medium mt-0.5">
                {formulation.product_detail?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">SKU</p>
              <p className="font-mono text-xs mt-0.5">
                {formulation.product_detail?.sku ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Version</p>
              <p className="font-mono text-xs mt-0.5">v{formulation.version}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Status</p>
              <div className="mt-0.5">
                <Badge variant={formulation.is_active ? 'green' : 'amber'}>
                  {formulation.is_active ? 'Active' : 'Draft'}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Batch Quantity</p>
              <p className="font-mono text-xs mt-0.5">
                {parseFloat(formulation.batch_qty || '0').toLocaleString()} {formulation.batch_unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total %w/w</p>
              <p
                className={`font-mono text-xs mt-0.5 ${
                  totalOk ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {total.toFixed(4)}%{!totalOk && ' ⚠'}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Interactive section — lines + note + toggle */}
        <FormulationDetailClient
          formulation={formulation}
          ingredients={ingredients}
        />
      </div>
    </div>
  );
}
