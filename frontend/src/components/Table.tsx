import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  getRowKey: (item: T) => string | number;
  emptyText?: string;
};

export function Table<T>({ columns, data, getRowKey, emptyText = "Нет данных" }: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink/10 text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase tracking-wide text-ink/55">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {data.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-ink/55" colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={getRowKey(item)} className="hover:bg-ink/[0.02]">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-ink/75">
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
