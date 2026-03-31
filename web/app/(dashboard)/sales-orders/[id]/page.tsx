import { getSalesOrder, getArtworkDocs, getCustomers } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [so, docs, customers] = await Promise.all([
    getSalesOrder(id),
    getArtworkDocs(id),
    getCustomers(),
  ]);
  const customer = customers.find((c) => c.id === so.customer_id);

  return (
    <div>
      <Topbar
        title={so.order_number}
        action={
          <Link href="/sales-orders" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back to Sales Orders
          </Link>
        }
      />
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
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
                  {Number(so.total_pieces).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Created</span>
                <span>{new Date(so.created_at).toLocaleDateString()}</span>
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
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Artwork</span>
                <Badge variant={so.artwork_status === 'approved' ? 'green' : 'amber'}>
                  {so.artwork_status}
                </Badge>
              </div>
              {so.fda_required && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">FDA</span>
                  <Badge variant={so.fda_status === 'approved' ? 'green' : 'amber'}>
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
            <CardBody className="text-sm">
              <p className="text-neutral-500">FDA Required</p>
              <p className="font-medium mt-1">{so.fda_required ? 'Yes' : 'No'}</p>
            </CardBody>
          </Card>
        </div>

        {/* Artwork Documents */}
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Artwork Documents
            </p>
          </CardHeader>
          <CardBody>
            {docs.length === 0 ? (
              <p className="text-sm text-neutral-400">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between text-sm py-2
                               border-b-[0.5px] border-neutral-100 last:border-0"
                  >
                    <div>
                      <span className="font-medium">{doc.doc_type}</span>
                      <span className="text-neutral-400 ml-2 text-xs">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
