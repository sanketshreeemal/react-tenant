import React from 'react';
import { MultiMonthDelinquentUnitInfo } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import logger from '@/lib/logger';

interface MultiMonthDelinquencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  delinquentUnits: MultiMonthDelinquentUnitInfo[];
  groupName: string;
  formatMonthYear: (dateStr: string) => string;
  formatCurrency: (amount: number) => string;
}

/**
 * Modal component to display units with a history of past due rent payments.
 * Shows unit details, tenant name, lease rent, all delinquent periods, and total overdue amount.
 */
const MultiMonthDelinquencyModal: React.FC<MultiMonthDelinquencyModalProps> = ({
  isOpen,
  onClose,
  delinquentUnits,
  groupName,
  formatMonthYear,
  formatCurrency,
}) => {
  if (!isOpen) return null;

  logger.info(`MultiMonthDelinquencyModal: Rendering for group '${groupName}' with ${delinquentUnits.length} units.`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle>Delinquent Rent History: {groupName}</CardTitle>
          <CardDescription>
            Units with a history of one or more missed rent payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          {delinquentUnits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Delinquent Periods</TableHead>
                  <TableHead className="text-right">Total Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delinquentUnits.map((unit) => (
                  <TableRow key={unit.leaseId}>
                    <TableCell>{unit.unitNumber}</TableCell>
                    <TableCell>
                      <div className="text-left">
                        <span className="hidden md:inline">{unit.tenantName || 'N/A'}</span>
                        <span className="md:hidden">{(unit.tenantName || 'N/A').split(' ')[0]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(unit.leaseRentAmount || 0)}</TableCell>
                    <TableCell>
                      {unit.delinquentPeriods && unit.delinquentPeriods.length > 0 ? (
                        <ol className="list-decimal list-inside">
                          {unit.delinquentPeriods.map(dp => (
                            <li key={dp.period}>{formatMonthYear(dp.period)} ({formatCurrency(dp.amountDue)})</li>
                          ))}
                        </ol>
                      ) : (
                        <span>No specific delinquent periods found.</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(unit.totalOverdueAmount || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No units with past delinquencies found for this group.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MultiMonthDelinquencyModal; 