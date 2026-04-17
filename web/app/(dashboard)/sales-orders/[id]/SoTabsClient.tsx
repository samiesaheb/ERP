'use client';

import { useState } from 'react';
import Link from 'next/link';
import Badge, { shipmentStatusVariant } from '@/components/ui/Badge';
import type { Artwork, FdaRegistration, FdaDocument, Shipment } from '@/lib/types';

type Tab = 'artworks' | 'fda' | 'shipments';

const TABS: { key: Tab; label: string }[] = [
  { key: 'artworks',  label: 'Artworks'           },
  { key: 'fda',       label: 'FDA Registrations'  },
  { key: 'shipments', label: 'Related Shipments'  },
];

interface Props {
  artworks:          Artwork[];
  fdaRegistrations:  FdaRegistration[];
  fdaDocuments:      Record<string, FdaDocument[]>;  // registration_id → docs
  relatedShipments:  Shipment[];
  itemMap:           Record<string, string>;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function statusVariant(status: string) {
  if (status === 'approved') return 'green' as const;
  if (status === 'submitted' || status === 'in_review') return 'amber' as const;
  if (status === 'rejected') return 'red' as const;
  return 'gray' as const;
}

export default function SoTabsClient({ artworks, fdaRegistrations, fdaDocuments, relatedShipments, itemMap }: Props) {
  const [tab, setTab] = useState<Tab>('artworks');

  const counts: Record<Tab, number> = {
    artworks:  artworks.length,
    fda:       fdaRegistrations.length,
    shipments: relatedShipments.length,
  };

  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
      {/* Pill tabs */}
      <div className="px-4 pt-4 pb-0 border-b-[0.5px] border-neutral-100">
        <div className="flex gap-0.5 bg-neutral-100 rounded-xl p-1 w-fit mb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-neutral-900 shadow-sm ring-[0.5px] ring-neutral-900/[0.06]'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-200 text-neutral-500'
                }`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Artworks ── */}
      {tab === 'artworks' && (
        <div className="p-4">
          {artworks.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">No artworks yet</p>
          ) : (
            <div className="space-y-2">
              {artworks.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center justify-between text-sm py-2.5 border-b-[0.5px] border-neutral-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium font-mono text-xs bg-neutral-100 px-2 py-0.5 rounded">
                      v{art.version}
                    </span>
                    <span className="text-neutral-600">{itemMap[art.item_id] ?? '—'}</span>
                    {art.approved_at && (
                      <span className="text-neutral-400 text-xs">
                        Approved {formatDate(art.approved_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(art.status)}>{art.status}</Badge>
                    {art.file_url && (
                      <a href={art.file_url} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline">
                        View file
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FDA Registrations ── */}
      {tab === 'fda' && (
        <div className="p-4 space-y-3">
          {fdaRegistrations.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">No FDA registrations linked to this order</p>
          ) : (
            fdaRegistrations.map((reg) => {
              const docs = fdaDocuments[reg.id] ?? [];
              return (
                <div key={reg.id} className="rounded-xl border-[0.5px] border-neutral-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{itemMap[reg.item_id] ?? reg.item_id}</span>
                        <Badge variant={statusVariant(reg.status)}>{reg.status}</Badge>
                      </div>
                      <p className="text-neutral-500">
                        Reg #: {reg.registration_number ?? 'Pending assignment'}
                      </p>
                      <p className="text-neutral-400 text-xs">
                        Submitted {formatDate(reg.submitted_at)} · Approved {formatDate(reg.approved_at)} · Expires {formatDate(reg.expiry_date)}
                      </p>
                      {reg.notes && <p className="text-neutral-600">{reg.notes}</p>}
                    </div>
                    <div className="min-w-48 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                        Documents
                      </p>
                      {docs.length === 0 ? (
                        <p className="text-neutral-400 text-xs">No documents uploaded</p>
                      ) : (
                        <div className="space-y-1.5">
                          {docs.map((doc) => (
                            <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                              className="flex items-center justify-between gap-3 text-blue-600 hover:text-blue-700 text-xs">
                              <span>{doc.doc_type}</span>
                              <span className="text-neutral-400">{formatDate(doc.uploaded_at)}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Related Shipments ── */}
      {tab === 'shipments' && (
        <div className="p-4 space-y-2">
          {relatedShipments.length === 0 ? (
            <p className="text-sm text-neutral-400 py-2">No shipments created for this order</p>
          ) : (
            relatedShipments.map((shipment) => (
              <div key={shipment.id}
                className="flex flex-col gap-2 rounded-lg border-[0.5px] border-neutral-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{shipment.shipment_number}</p>
                  <p className="text-neutral-500 text-xs mt-0.5">
                    {shipment.carrier ?? 'Carrier pending'}
                    {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={shipmentStatusVariant(shipment.status)}>{shipment.status}</Badge>
                  <span className="text-neutral-400 text-xs">
                    {formatDate(shipment.dispatched_at ?? shipment.created_at)}
                  </span>
                  <Link href={`/shipments/${shipment.id}`} className="text-xs text-blue-600 hover:text-blue-700">
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
