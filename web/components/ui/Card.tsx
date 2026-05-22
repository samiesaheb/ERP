interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border-[0.5px] border-neutral-200 dark:border-neutral-800 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`px-4 py-3 border-b-[0.5px] border-neutral-200 dark:border-neutral-800 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>;
}
