'use client';

import StatusActions from '@/components/ui/StatusActions';
import { updatePurchaseOrderStatus } from '@/lib/mutations';

interface Props {
  poId: string;
  status: string;
}

export default function StatusPanel({ poId, status }: Props) {
  return (
    <StatusActions
      resourceType="purchase-order"
      currentStatus={status}
      onTransition={(next) => updatePurchaseOrderStatus(poId, next)}
    />
  );
}
