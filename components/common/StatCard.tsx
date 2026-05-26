import type { ReactNode } from 'react';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  trend?: { value: string; positive?: boolean };
}

export default function StatCard({ label, value, hint, icon, trend }: StatCardProps) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-brand-gray-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-brand-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-brand-black">{value}</p>
        {(hint || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={
                  trend.positive
                    ? 'rounded-full bg-success-soft px-2 py-0.5 font-semibold text-success'
                    : 'rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger'
                }
              >
                {trend.value}
              </span>
            )}
            {hint && <span className="text-brand-gray-500">{hint}</span>}
          </div>
        )}
      </div>
      {icon && (
        <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-blue-soft text-brand-blue">
          {icon}
        </div>
      )}
    </div>
  );
}
