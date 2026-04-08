'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';

type Variant = 'primary' | 'secondary' | 'danger';

interface Transition {
  label: string;
  nextStatus: string;
  variant: Variant;
}

const TRANSITIONS: Record<string, Record<string, Transition[]>> = {
  'sales-order': {
    draft:         [{ label: 'Confirm Order',    nextStatus: 'confirmed',    variant: 'primary' },
                    { label: 'Cancel',            nextStatus: 'cancelled',    variant: 'danger'  }],
    confirmed:     [{ label: 'Start Production', nextStatus: 'in_production', variant: 'primary' },
                    { label: 'Cancel',            nextStatus: 'cancelled',    variant: 'danger'  }],
    in_production: [{ label: 'Mark Shipped',     nextStatus: 'shipped',      variant: 'primary' },
                    { label: 'Cancel',            nextStatus: 'cancelled',    variant: 'danger'  }],
    shipped:       [{ label: 'Mark Invoiced',    nextStatus: 'invoiced',     variant: 'primary' }],
  },
  'manufacturing-order': {
    draft:       [{ label: 'Plan Order',       nextStatus: 'planned',     variant: 'primary' },
                  { label: 'Cancel',            nextStatus: 'cancelled',   variant: 'danger'  }],
    planned:     [{ label: 'Start Production', nextStatus: 'in_progress', variant: 'primary' },
                  { label: 'Cancel',            nextStatus: 'cancelled',   variant: 'danger'  }],
    in_progress: [{ label: 'Complete',         nextStatus: 'completed',   variant: 'primary' },
                  { label: 'Cancel',            nextStatus: 'cancelled',   variant: 'danger'  }],
  },
  'production-batch': {
    planned:         [{ label: 'Start Bulk Production', nextStatus: 'bulk_production', variant: 'primary' }],
    bulk_production: [{ label: 'Advance to Filling',    nextStatus: 'filling',         variant: 'primary' }],
    filling:         [{ label: 'Advance to Packing',    nextStatus: 'packing',         variant: 'primary' }],
    packing:         [{ label: 'Mark Completed',        nextStatus: 'completed',       variant: 'primary' }],
  },
  'purchase-order': {
    draft:              [{ label: 'Send to Supplier', nextStatus: 'sent',      variant: 'primary' },
                         { label: 'Cancel',            nextStatus: 'cancelled', variant: 'danger'  }],
    sent:               [{ label: 'Confirm PO',       nextStatus: 'confirmed', variant: 'primary' },
                         { label: 'Cancel',            nextStatus: 'cancelled', variant: 'danger'  }],
    confirmed:          [{ label: 'Cancel',            nextStatus: 'cancelled', variant: 'danger'  }],
    partially_received: [{ label: 'Mark Received',    nextStatus: 'received',  variant: 'primary' },
                         { label: 'Cancel',            nextStatus: 'cancelled', variant: 'danger'  }],
  },
  shipment: {
    loading:    [{ label: 'Dispatch',         nextStatus: 'dispatched', variant: 'primary' }],
    dispatched: [{ label: 'Mark In Transit',  nextStatus: 'in_transit', variant: 'primary' }],
    in_transit: [{ label: 'Mark Delivered',   nextStatus: 'delivered',  variant: 'primary' }],
  },
  invoice: {
    draft:          [{ label: 'Send Invoice',    nextStatus: 'sent',           variant: 'primary' },
                     { label: 'Cancel',           nextStatus: 'cancelled',      variant: 'danger'  }],
    sent:           [{ label: 'Mark Paid',       nextStatus: 'paid',           variant: 'primary' },
                     { label: 'Mark Overdue',    nextStatus: 'overdue',        variant: 'secondary'},
                     { label: 'Cancel',           nextStatus: 'cancelled',      variant: 'danger'  }],
    partially_paid: [{ label: 'Mark Paid',       nextStatus: 'paid',           variant: 'primary' },
                     { label: 'Mark Overdue',    nextStatus: 'overdue',        variant: 'secondary'}],
    overdue:        [{ label: 'Mark Paid',       nextStatus: 'paid',           variant: 'primary' },
                     { label: 'Cancel',           nextStatus: 'cancelled',      variant: 'danger'  }],
  },
};

interface StatusActionsProps {
  resourceType: keyof typeof TRANSITIONS;
  currentStatus: string;
  onTransition: (nextStatus: string) => Promise<unknown>;
}

export default function StatusActions({
  resourceType,
  currentStatus,
  onTransition,
}: StatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transitions = TRANSITIONS[resourceType]?.[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  async function handleClick(nextStatus: string) {
    setLoading(nextStatus);
    setError(null);
    try {
      await onTransition(nextStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.nextStatus}
            variant={t.variant}
            size="sm"
            disabled={loading !== null}
            onClick={() => handleClick(t.nextStatus)}
          >
            {loading === t.nextStatus ? 'Updating…' : t.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
