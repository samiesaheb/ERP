import { getBom, getBomLines, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import BomExplosionPanel from './BomExplosionPanel';
import Link from 'next/link';

export default async function BomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bom, lines, items, uoms] = await Promise.all([
    getBom(id),
    getBomLines(id),
    getItems(),
    getUoms(),
  ]);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
  const uomMap = Object.fromEntries(uoms.map((u) => [u.id, u.code]));
  const fgItem = itemMap[bom.item_id];

  return (
    <div>
      <Topbar
        title={bom.code}
        action={
          <Link href="/bom" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back to BOMs
          </Link>
        }
      />
      <div className="px-6 py-5 space-y-4">
        {/* Header */}
        <Card>
          <CardBody className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-neutral-500">Finished Good</p>
              <p className="font-medium mt-0.5">
                {fgItem ? `${fgItem.code} — ${fgItem.description}` : bom.item_id}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Version</p>
              <p className="font-medium mt-0.5">v{bom.version}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Status</p>
              <div className="mt-0.5">
                <Badge variant={bom.status === 'active' ? 'green' : 'amber'}>
                  {bom.status}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Ingredients table */}
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Ingredients / Components
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Component</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Qty / Batch</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">UOM</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const comp = itemMap[line.component_item_id];
                  return (
                    <tr key={line.id} className="border-b-[0.5px] border-neutral-100">
                      <td className="px-4 py-3 text-neutral-400">{line.line_order}</td>
                      <td className="px-4 py-3">
                        {comp ? (
                          <div>
                            <p className="font-medium">{comp.code}</p>
                            <p className="text-xs text-neutral-500">{comp.description}</p>
                          </div>
                        ) : (
                          line.component_item_id
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {Number(line.qty_per_batch).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* BOM Explosion panel — client component */}
        <BomExplosionPanel bomId={id} />
      </div>
    </div>
  );
}
