import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-brand-gray-200 bg-brand-gray-50 px-6 py-14 text-center">
      {icon && <div className="text-brand-gray-400">{icon}</div>}
      <p className="text-base font-semibold text-brand-black">{title}</p>
      {description && (
        <p className="max-w-md text-sm text-brand-gray-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
