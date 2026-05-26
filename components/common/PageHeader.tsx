import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-brand-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-brand-black">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-brand-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
