import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
}

export function Table<T>({ columns, rows, rowKey }: TableProps<T>) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
          {columns.map((col) => (
            <th key={col.header} style={{ padding: '10px 12px', color: '#475569' }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} style={{ borderBottom: '1px solid #f1f5f9' }}>
            {columns.map((col) => (
              <td key={col.header} style={{ padding: '10px 12px' }}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
