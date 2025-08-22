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
import { useAppStore } from '@/store/useAppStore';
import { FilterDrawer } from './FilterDrawer';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const { filters, tempFilters, setFilters, setTempFilters, clearFilters } = useAppStore();
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

  const filteredRows = useMemo(() => {
    let filtered = [...rows];
    columns.forEach((column) => {
      if (column.allowFilter && filters[column.id]?.length > 0) {
        filtered = filtered.filter((row) => filters[column.id].includes(row[column.id]));
      }
    });
    columns.forEach((column) => {
      if (column.type === 'date' && filters[column.id + 'Sort']?.length > 0) {
        const sortType = filters[column.id + 'Sort'][0];
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
    setFilters({ ...tempFilters });
    closeDrawer();
  };
  const cancelFilters = () => {
    setTempFilters({ ...filters });
    closeDrawer();
  };
  const removeAllFilters = () => {
    clearFilters();
    closeDrawer();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <div className="flex items-center w-full mb-4">
          {title && (
            <h2 className="text-xl font-bold flex-grow text-center">
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

      <Table>
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
                      : column.units === 'rupee'
                        ? `₹${columnTotals[column.id].toFixed(2)}`
                        : column.units && column.units !== 'none'
                          ? `${columnTotals[column.id].toFixed(2)} ${column.units}`
                          : columnTotals[column.id].toFixed(2)}
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
