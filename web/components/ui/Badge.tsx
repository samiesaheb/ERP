type BadgeVariant = 'blue' | 'amber' | 'green' | 'red' | 'gray' | 'purple';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  blue:   'bg-blue-50   text-blue-700   border-blue-200',
  amber:  'bg-amber-50  text-amber-700  border-amber-200',
  green:  'bg-green-50  text-green-700  border-green-200',
  red:    'bg-red-50    text-red-700    border-red-200',
  gray:   'bg-neutral-100 text-neutral-600 border-neutral-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                  border-[0.5px] ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}

// Helper maps for domain status → variant
export function soStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    artwork: 'blue', planning: 'amber', production: 'purple',
    packing: 'amber', shipped: 'green',
  };
  return map[status] ?? 'gray';
}

export function moStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    planned: 'blue', running: 'amber', packing: 'purple', done: 'green', on_hold: 'red',
  };
  return map[status] ?? 'gray';
}

export function poStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ordered: 'blue', confirmed: 'amber', in_transit: 'purple', received: 'green',
  };
  return map[status] ?? 'gray';
}

export function invoiceStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    not_due: 'blue', partial: 'amber', paid: 'green', overdue: 'red',
  };
  return map[status] ?? 'gray';
}

export function batchStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    running: 'amber', delayed: 'red', done: 'green',
  };
  return map[status] ?? 'gray';
}

export function qcStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    pending: 'blue', passed: 'green', failed: 'red', hold: 'amber',
  };
  return map[status] ?? 'gray';
}
