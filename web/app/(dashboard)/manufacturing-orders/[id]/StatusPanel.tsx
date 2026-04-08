'use client';

import StatusActions from '@/components/ui/StatusActions';
import { updateManufacturingOrderStatus } from '@/lib/mutations';

interface Props {
  moId: string;
  status: string;
}

export default function StatusPanel({ moId, status }: Props) {
  return (
    <StatusActions
      resourceType="manufacturing-order"
      currentStatus={status}
      onTransition={(next) => updateManufacturingOrderStatus(moId, next)}
    />
  );
}
