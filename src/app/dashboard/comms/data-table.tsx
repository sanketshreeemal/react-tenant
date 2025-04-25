"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  RowSelectionState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowSelectionChange?: (selectedRows: TData[], selectedIds: string[]) => void
  defaultSorting?: SortingState
  tableRef?: (table: any) => void
  selectedRowIds?: string[]
}

export function DataTable<TData extends { id?: string; uid?: string }, TValue>({
  columns,
  data,
  onRowSelectionChange,
  defaultSorting = [],
  tableRef,
  selectedRowIds = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)
  const buildRowSelection = React.useCallback(() => {
    const selection: Record<number, boolean> = {};
    data.forEach((row, idx) => {
      const id = (row.id || row.uid) as string | undefined;
      if (id && selectedRowIds.includes(id)) {
        selection[idx] = true;
      }
    });
    return selection;
  }, [data, selectedRowIds]);

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(buildRowSelection());

  React.useEffect(() => {
    setRowSelection(buildRowSelection());
  }, [buildRowSelection]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
    },
    onRowSelectionChange: (updater) => {
      const newState = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newState);
      if (onRowSelectionChange) {
        const selectedRows = data.filter((_, index) => newState[index]);
        const selectedIds = selectedRows.map(row => (row.id || row.uid) as string).filter(Boolean);
        onRowSelectionChange(selectedRows, selectedIds);
      }
    },
  })

  React.useEffect(() => {
    if (tableRef) {
      tableRef({
        resetRowSelection: () => {
          table.resetRowSelection();
          setRowSelection({});
        },
        deselectRowById: (id: string) => {
          const idx = data.findIndex((row: any) => row.id === id || row.uid === id);
          if (idx !== -1) {
            setRowSelection(prev => {
              const newSel = { ...prev };
              delete newSel[idx];
              return newSel;
            });
          }
        }
      });
    }
  }, [table, tableRef, data]);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
} 