import React, { useMemo, useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Funnel, FunnelPlus } from 'lucide-react';
import { FilterDrawer } from './FilterDrawer';
import { useUrlFilters } from '@/utils/useUrlState';

const DEFAULT_DATE_SORT = 'latest';

function formatTotal(total: number, units?: string): string {
  if (units === 'rupee') return `₹${total.toFixed(2)}`;
  if (units && units !== 'none') return `${total.toFixed(2)} ${units}`;
  return total.toFixed(2);
}

export interface Column {
  id: string;
  label: string;
  type?: 'date' | 'string' | 'number';
  showTotal?: boolean;
  allowFilter?: boolean;
  className?: string;
  units?: string;
  customTotal?: (rows: Row[], columns: Column[]) => React.ReactNode;
}

export interface Row {
  [key: string]: any;
}

interface TransactionsTableProps {
  columns: Column[];
  rows: Row[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  titleIcon?: React.ReactNode;
  actions?: React.ReactNode; // top-right actions (e.g., Add)
  actionsRenderer?: (row: Row, index: number) => React.ReactNode; // per-row actions
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  columns,
  rows,
  isLoading = false,
  error = null,
  title,
  titleIcon,
  actions,
  actionsRenderer,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filterColumns = useMemo(() => {
    return columns
      .filter((column) => column.allowFilter)
      .map((column) => {
        if (column.type === 'date') {
          return {
            id: column.id + 'Sort',
            label: column.label,
            options: [
              { value: 'latest', label: 'Latest First' },
              { value: 'earliest', label: 'Earliest First' },
            ],
          };
        }
        const uniqueValues = [
          ...new Set(
            rows
              .map((row) => row[column.id])
              .filter((v) => v !== undefined && v !== null && v !== '-')
          ),
        ];
        return {
          id: column.id,
          label: column.label,
          options: uniqueValues.map((value) => ({ value, label: value })),
        };
      });
  }, [columns, rows]);

  const filterKeys = useMemo(() => filterColumns.map((c) => c.id), [filterColumns]);
  const { filters, setFilters, clearFilters } = useUrlFilters(filterKeys);
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({});

  const filteredRows = useMemo(() => {
    let filtered = [...rows];
    columns.forEach((column) => {
      if (column.allowFilter && filters[column.id]?.length > 0) {
        filtered = filtered.filter((row) => filters[column.id].includes(row[column.id]));
      }
    });
    columns.forEach((column) => {
      if (column.type === 'date') {
        const sortKey = column.id + 'Sort';
        const sortType = filters[sortKey]?.[0] ?? DEFAULT_DATE_SORT;
        filtered.sort((a, b) => {
          const dateA = new Date(a[column.id] || '').getTime();
          const dateB = new Date(b[column.id] || '').getTime();
          return sortType === 'latest' ? dateB - dateA : dateA - dateB;
        });
      }
    });
    return filtered;
  }, [rows, filters, columns]);

  const filterCount = useMemo(() => {
    return Object.values(filters).reduce((sum, values) => sum + (values?.length || 0), 0);
  }, [filters]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    columns.forEach((column) => {
      if (column.showTotal) {
        totals[column.id] = filteredRows.reduce((sum: number, row: Row) => {
          if (typeof row[column.id] === 'number') {
            if (!columns.some((c) => c.id === 'type') || row.type === 'credit') {
              return sum + row[column.id];
            }
          }
          return sum;
        }, 0);
      }
    });
    return totals;
  }, [columns, filteredRows]);

  const openDrawer = () => {
    setTempFilters({ ...filters });
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => setIsDrawerOpen(false);
  const applyFilters = () => {
    setFilters(tempFilters);
    closeDrawer();
  };
  const cancelFilters = () => {
    setTempFilters({ ...filters });
    closeDrawer();
  };
  const removeAllFilters = () => {
    setTempFilters({});
    clearFilters();
    closeDrawer();
  };

  const formatValue = (value: any, type: string = 'string', units?: string) => {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
      default:
        if (units === 'rupee') return `₹${Number(value).toFixed(2)}`;
        if (units && units !== 'none') return `${value} ${units}`;
        return value;
    }
  };

  const renderCell = (row: Row, column: Column) => {
    const value = row[column.id];

    if (column.id === 'type') {
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === 'credit'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {value === 'credit' ? 'Credit' : 'Debit'}
        </span>
      );
    }

    return formatValue(value, column.type, column.units);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error loading transactions</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {(title || actions) && (
        <div className="flex items-center gap-2 w-full mb-4">
          {title && (
            <h2 className="text-base sm:text-xl font-bold flex-grow min-w-0 text-center">
              <span className="inline-flex items-center gap-2">
                {titleIcon}
                {title}
              </span>
            </h2>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openDrawer}
              className="flex items-center gap-2"
              title="Filter the table"
            >
              {filterCount > 0 ? (
                <FunnelPlus className="w-4 h-4" />
              ) : (
                <Funnel className="w-4 h-4" />
              )}
            </Button>
            {actions}
          </div>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {filteredRows.map((row, idx) => {
          const [headingColumn, ...detailColumns] = columns;
          return (
            <div key={row._id || idx} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="font-semibold text-sm">
                  {headingColumn ? renderCell(row, headingColumn) : `#${idx + 1}`}
                </div>
                {actionsRenderer && <div className="shrink-0">{actionsRenderer(row, idx)}</div>}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {detailColumns.map((column) => (
                  <div key={column.id} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {column.label}
                    </dt>
                    <dd className={`text-sm truncate ${column.className ?? ''}`}>
                      {renderCell(row, column)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}

        {Object.keys(columnTotals).length > 0 && (
          <div className="rounded-lg border p-3 bg-muted/40">
            <div className="font-semibold text-sm mb-2">Total</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {columns
                .filter((column) => column.showTotal)
                .map((column) => (
                  <div key={column.id} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {column.label}
                    </dt>
                    <dd className={`text-sm truncate ${column.className ?? ''}`}>
                      {column.customTotal
                        ? column.customTotal(filteredRows, columns)
                        : formatTotal(columnTotals[column.id], column.units)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </div>

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.label}
              </TableHead>
            ))}
            {actionsRenderer && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredRows.map((row, idx) => (
            <TableRow key={row._id || idx}>
              <TableCell>{idx + 1}</TableCell>
              {columns.map((column) => (
                <TableCell key={column.id} className={column.className}>
                  {renderCell(row, column)}
                </TableCell>
              ))}
              {actionsRenderer && <TableCell>{actionsRenderer(row, idx)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>

        {Object.keys(columnTotals).length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell>
                {/* S.No column */}
                Total
              </TableCell>
              {columns.map((column) =>
                column.showTotal ? (
                  <TableCell key={column.id} className={column.className}>
                    {column.customTotal
                      ? column.customTotal(filteredRows, columns)
                      : formatTotal(columnTotals[column.id], column.units)}
                  </TableCell>
                ) : (
                  <TableCell key={column.id} className={column.className} />
                )
              )}
              {actionsRenderer && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>

      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        columns={filterColumns}
        filters={filters}
        tempFilters={tempFilters}
        onTempFiltersChange={setTempFilters}
        onApply={applyFilters}
        onCancel={cancelFilters}
        onRemoveAll={removeAllFilters}
      />
    </div>
  );
};
