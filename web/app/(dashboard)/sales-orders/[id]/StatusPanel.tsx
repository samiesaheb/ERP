'use client';

import StatusActions from '@/components/ui/StatusActions';
import { updateSalesOrderStatus } from '@/lib/mutations';

interface Props {
  soId: string;
  status: string;
}

export default function StatusPanel({ soId, status }: Props) {
  return (
    <StatusActions
      resourceType="sales-order"
      currentStatus={status}
      onTransition={(next) => updateSalesOrderStatus(soId, next)}
    />
  );
}
