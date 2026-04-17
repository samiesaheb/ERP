import {
  getArtworksBySo,
  getCustomers,
  getFdaDocuments,
  getFdaRegistrations,
  getItems,
  getSalesOrder,
  getShipments,
  getSoLines,
  getUoms,
} from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';
import StatusPanel from './StatusPanel';
import AddSoLineButton from './AddSoLineButton';
import SoTabsClient from './SoTabsClient';

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatNumber(value: string | null | undefined) {
  if (!value) return '—';
  return Number(value).toLocaleString();
}

function statusVariant(status: string) {
  if (status === 'approved') return 'green' as const;
  if (status === 'submitted' || status === 'in_review') return 'amber' as const;
  if (status === 'rejected') return 'red' as const;
  return 'gray' as const;
}

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [so, artworks, customers, soLines, allFdaRegistrations, items, uoms, shipments] = await Promise.all([
    getSalesOrder(id),
    getArtworksBySo(id),
    getCustomers(),
    getSoLines(id),
    getFdaRegistrations(),
    getItems(),
    getUoms(),
    getShipments(),
  ]);
  const customer = customers.find((c) => c.id === so.customer_id);
  const itemMap = Object.fromEntries(items.map((item) => [item.id, `${item.item_code} — ${item.description}`]));
  const uomMap = Object.fromEntries(uoms.map((uom) => [uom.id, uom.code]));
  const fdaRegistrations = allFdaRegistrations.filter((registration) => registration.sales_order_id === id);
  const fdaDocumentsByRegistration = new Map(
    (await Promise.all(
      fdaRegistrations.map(async (registration) => [registration.id, await getFdaDocuments(registration.id)] as const),
    )),
  );
  const relatedShipments = shipments.filter((shipment) => shipment.sales_order_id === id);

  return (
    <div>
      <Topbar
        title={so.order_number}
        action={
          <div className="flex items-center gap-4 text-xs">
            <Link href="/sales-orders" className="text-neutral-500 hover:text-neutral-700">
              ← Back to Sales Orders
            </Link>
            <Link
              href={`/shipments?createFor=${so.id}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Create Shipment
            </Link>
          </div>
        }
      />
      <div className="px-6 py-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Order Info
              </p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer</span>
                <span className="font-medium">{customer?.name ?? so.customer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Pieces</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(so.total_pieces)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Order Date</span>
                <span>{formatDate(so.order_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Required</span>
                <span>{formatDate(so.required_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Created</span>
                <span>{formatDate(so.created_at)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Status
              </p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Order</span>
                <Badge variant={soStatusVariant(so.status)}>{so.status}</Badge>
              </div>
              <StatusPanel soId={so.id} status={so.status} />
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Artwork</span>
                <Badge variant={statusVariant(so.artwork_status ?? 'pending')}>
                  {so.artwork_status ?? 'pending'}
                </Badge>
              </div>
              {so.fda_required && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">FDA</span>
                  <Badge variant={statusVariant(so.fda_status ?? 'pending')}>
                    {so.fda_status ?? 'pending'}
                  </Badge>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Regulatory
              </p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">FDA Required</span>
                <span className="font-medium">{so.fda_required ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Registrations</span>
                <span className="font-medium">{fdaRegistrations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Artwork Versions</span>
                <span className="font-medium">{artworks.length}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Shipping
              </p>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipments</span>
                <span className="font-medium">{relatedShipments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Latest Status</span>
                <span className="font-medium">{relatedShipments[0]?.status ?? '—'}</span>
              </div>
              <div className="pt-2">
                <Link href={`/shipments?createFor=${so.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Open Shipment Form
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Sales Order Lines
            </p>
            {!['shipped', 'invoiced', 'cancelled'].includes(so.status) && (
              <AddSoLineButton soId={id} items={items} uoms={uoms} />
            )}
          </CardHeader>
          <div className="overflow-x-auto">
            {soLines.length === 0 ? (
              <div className="px-4 py-4 text-sm text-neutral-400">No line items yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                    {['Item', 'Qty Ordered', 'UOM', 'Unit Price', 'Notes'].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {soLines.map((line) => (
                    <tr key={line.id} className="border-b-[0.5px] border-neutral-100 last:border-0">
                      <td className="px-4 py-3">{itemMap[line.item_id] ?? line.item_id}</td>
                      <td className="px-4 py-3 tabular-nums">{formatNumber(line.qty_ordered)}</td>
                      <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? line.uom_id}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {line.unit_price ? `$${formatNumber(line.unit_price)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{line.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <SoTabsClient
          artworks={artworks}
          fdaRegistrations={fdaRegistrations}
          fdaDocuments={Object.fromEntries(fdaDocumentsByRegistration)}
          relatedShipments={relatedShipments}
          itemMap={itemMap}
        />

        {so.notes && (
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                Notes
              </p>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{so.notes}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
