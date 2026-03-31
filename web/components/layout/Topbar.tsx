interface TopbarProps {
  title: string;
  action?: React.ReactNode;
}

export default function Topbar({ title, action }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b-[0.5px] border-neutral-200 bg-white">
      <h1 className="text-base font-semibold text-neutral-900">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}
