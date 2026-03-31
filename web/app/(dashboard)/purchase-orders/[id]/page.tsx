import { getPurchaseOrder, getPoLines, getSuppliers, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [po, lines, suppliers, items, uoms] = await Promise.all([
    getPurchaseOrder(id),
    getPoLines(id),
    getSuppliers(),
    getItems(),
    getUoms(),
  ]);
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.code} — ${i.description}`]));
  const uomMap = Object.fromEntries(uoms.map((u) => [u.id, u.code]));

  return (
    <div>
      <Topbar
        title={po.po_number}
        action={
          <Link href="/purchase-orders" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
        }
      />
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardBody className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-neutral-500">Supplier</span><span className="font-medium">{supplierMap[po.supplier_id]}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Expected</span><span>{po.expected_date}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total</span><span className="font-medium tabular-nums">${Number(po.total_amount).toLocaleString()}</span></div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Status</span>
                <Badge variant={poStatusVariant(po.status)}>{po.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Type</span>
                <Badge variant={po.supplier_type === 'international' ? 'blue' : 'green'}>{po.supplier_type}</Badge>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader><p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">PO Lines</p></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  {['Item', 'Ordered', 'Received', 'Unit Price', 'UOM'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b-[0.5px] border-neutral-100">
                    <td className="px-4 py-3">{itemMap[line.item_id] ?? line.item_id}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.qty_ordered).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.qty_received).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">${Number(line.unit_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
