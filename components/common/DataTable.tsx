'use client';

import type { Key, ReactNode } from 'react';
import EmptyState from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  cell: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => Key;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-brand-gray-200 bg-white p-6 text-center text-sm text-brand-gray-500">
        불러오는 중…
      </div>
    );
  }

  if (rows.length === 0) {
    return empty ?? <EmptyState title="표시할 데이터가 없습니다." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-brand-gray-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-brand-gray-200 bg-brand-gray-50 text-brand-gray-600">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${alignClass(c.align)}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-brand-gray-100 last:border-b-0 ${
                onRowClick ? 'cursor-pointer hover:bg-brand-gray-50' : ''
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${alignClass(c.align)}`}>
                  {c.cell(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}
