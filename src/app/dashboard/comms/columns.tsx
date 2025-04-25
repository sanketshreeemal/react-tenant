"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Lease as FirebaseLease } from "../../../types"
import { theme } from "@/theme/theme"

// User interface
export interface AllUser {
  uid: string
  name?: string
  email: string
  landlordId: string
  role: 'admin' | 'user' | 'tenant'
  updatedAt: Date
}

// Helper function for sort icons
const SortIcon = ({ column }: { column: any }) => {
  if (!column.getIsSorted()) return null;
  return column.getIsSorted() === "asc" ? (
    <ArrowUp className="h-4 w-4 text-blue-500 ml-1" />
  ) : (
    <ArrowDown className="h-4 w-4 text-blue-500 ml-1" />
  );
};

// Column definitions for Tenants table
export const tenantColumns: ColumnDef<FirebaseLease>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "unitNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Unit
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-left">
        {row.getValue("unitNumber")}
      </div>
    ),
  },
  {
    accessorKey: "tenantName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Tenant
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => {
      const fullName = row.getValue("tenantName") as string;
      return (
        <div className="text-left">
          <span className="hidden md:inline">{fullName}</span>
          <span className="md:hidden">{fullName.split(' ')[0]}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900"
        >
          Email
          <SortIcon column={column} />
        </Button>
      )
    },
  },
  {
    accessorKey: "rentAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900"
        >
          Rent
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("rentAmount") || "0")
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
      return formatted
    },
  },
]

// New column definition specifically for the lease tab
export const leaseTabColumns: ColumnDef<FirebaseLease>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "unitNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Unit
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-left">
        {row.getValue("unitNumber")}
      </div>
    ),
  },
  {
    accessorKey: "tenantName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Tenant
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => {
      const fullName = row.getValue("tenantName") as string;
      return (
        <div className="text-left">
          <span className="hidden md:inline">{fullName}</span>
          <span className="md:hidden">{fullName.split(' ')[0]}</span>
        </div>
      );
    },
  },
  {
    id: "expiryStatus",
    accessorKey: "leaseEndDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Expiry
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => {
      const lease = row.original;
      const today = new Date();
      const endDate = new Date(lease.leaseEndDate);
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        return (
          <div className="text-left">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                color: theme.colors.error,
                backgroundColor: `${theme.colors.error}10`,
              }}
            >
              {Math.abs(daysLeft)} days
            </span>
          </div>
        );
      } else if (daysLeft <= 30) {
        return (
          <div className="text-left">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                color: "#CA8A04",
                backgroundColor: "#FEF9C3",
              }}
            >
              {daysLeft} days
            </span>
          </div>
        );
      }
      return null;
    }
  },
  {
    accessorKey: "rentAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900 justify-start w-full"
        >
          Rent
          <SortIcon column={column} />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("rentAmount") || "0")
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
      return <div className="text-left">{formatted}</div>
    },
  },
]

// Column definitions for Users table
export const userColumns: ColumnDef<AllUser>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900"
        >
          Name
          <SortIcon column={column} />
        </Button>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent font-semibold text-gray-900"
        >
          Email
          <SortIcon column={column} />
        </Button>
      )
    },
  }
]; 