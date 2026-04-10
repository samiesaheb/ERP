import { NextRequest, NextResponse } from 'next/server';
import {
  getItems,
  getCustomers,
  getSuppliers,
  getSalesOrders,
  getPurchaseOrders,
  getManufacturingOrders,
  getProductionBatches,
  getInvoices,
  getShipments,
  getReceipts,
} from '@/lib/api';

export interface SearchResult {
  entity_type: string;
  id: string;
  label: string;
  sublabel: string | null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  try {
    const [items, customers, suppliers, sos, pos, mos, batches, invoices, shipments, receipts] =
      await Promise.all([
        getItems(),
        getCustomers(),
        getSuppliers(),
        getSalesOrders(),
        getPurchaseOrders(),
        getManufacturingOrders(),
        getProductionBatches(),
        getInvoices(),
        getShipments(),
        getReceipts(),
      ]);

    const results: SearchResult[] = [
      ...items
        .filter((i) => i.item_code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
        .slice(0, 5)
        .map((i) => ({ entity_type: 'item', id: i.id, label: `${i.item_code} — ${i.description}`, sublabel: i.item_type })),

      ...customers
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({ entity_type: 'customer', id: c.id, label: c.name, sublabel: null })),

      ...suppliers
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((s) => ({ entity_type: 'supplier', id: s.id, label: s.name, sublabel: null })),

      ...sos
        .filter((s) => s.order_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((s) => ({ entity_type: 'sales_order', id: s.id, label: s.order_number, sublabel: s.status })),

      ...pos
        .filter((p) => p.po_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p) => ({ entity_type: 'purchase_order', id: p.id, label: p.po_number, sublabel: p.status })),

      ...mos
        .filter((m) => m.mo_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((m) => ({ entity_type: 'manufacturing_order', id: m.id, label: m.mo_number, sublabel: m.status })),

      ...batches
        .filter((b) => b.batch_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((b) => ({ entity_type: 'production_batch', id: b.id, label: b.batch_number, sublabel: b.status })),

      ...invoices
        .filter((i) => i.invoice_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((i) => ({ entity_type: 'invoice', id: i.id, label: i.invoice_number, sublabel: i.status })),

      ...shipments
        .filter((s) => s.shipment_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((s) => ({ entity_type: 'shipment', id: s.id, label: s.shipment_number, sublabel: s.status })),

      ...receipts
        .filter((r) => r.receipt_number.toLowerCase().includes(q))
        .slice(0, 5)
        .map((r) => ({ entity_type: 'receipt', id: r.id, label: r.receipt_number, sublabel: null })),
    ];

    return NextResponse.json(results.slice(0, 50));
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
