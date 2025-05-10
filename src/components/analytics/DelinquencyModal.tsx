import React from 'react';
import { DelinquentUnitInfo } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming these are exported from table.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from 'lucide-react';

interface DelinquencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  delinquentUnits: DelinquentUnitInfo[];
  groupName: string;
  rentalPeriod: string;
  formatCurrency: (amount: number) => string;
}

const DelinquencyModal: React.FC<DelinquencyModalProps> = ({
  isOpen,
  onClose,
  delinquentUnits,
  groupName,
  rentalPeriod,
  formatCurrency,
}) => {
  if (!isOpen) return null;

  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Delinquent Units: {groupName}</CardTitle>
            <p className="text-sm text-gray-500">For Rental Period: {rentalPeriod}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-grow">
          {delinquentUnits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Lease End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquentUnits.map((unit) => (
                  <TableRow key={unit.leaseId}>
                    <TableCell>{unit.unitNumber}</TableCell>
                    <TableCell>{unit.tenantName || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(unit.leaseRentAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(unit.amountPaidThisMonth)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatCurrency(unit.amountDueThisMonth)}</TableCell>
                    <TableCell>{formatDate(unit.leaseEndDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-4">No delinquent units for this period.</p>
          )}
        </CardContent>
        <div className="p-4 border-t">
            <Button onClick={onClose} className="w-full sm:w-auto" variant="outline">
                Close
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default DelinquencyModal; 