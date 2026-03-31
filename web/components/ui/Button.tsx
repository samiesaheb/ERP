import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 border-[0.5px] border-neutral-900',
  secondary:
    'bg-white text-neutral-700 hover:bg-neutral-50 border-[0.5px] border-neutral-300',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 border-[0.5px] border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 border-[0.5px] border-red-600',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 font-medium rounded
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${VARIANTS[variant]} ${sizeClass} ${className}`}
    >
      {children}
    </button>
  );
}
