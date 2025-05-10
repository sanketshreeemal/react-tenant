import React, { useState, useEffect } from 'react';

interface MonthYearPickerProps {
  initialTargetMonthYear?: string; // YYYY-MM
  onMonthYearChange: (targetMonthYear: string) => void;
  earliestMonthYear?: string; // YYYY-MM, e.g., "2025-03"
  latestMonthYear?: string; // YYYY-MM
  formatMonthYear?: (dateStr: string) => string;
  className?: string;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  initialTargetMonthYear,
  onMonthYearChange,
  earliestMonthYear = '2025-03', // Default earliest as per spec
  latestMonthYear,
  formatMonthYear,
  className = '',
}) => {
  const getInitialYear = () => {
    if (initialTargetMonthYear) return parseInt(initialTargetMonthYear.split('-')[0], 10);
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1); // Default to last fully completed month
    return currentDate.getFullYear();
  };

  const getInitialMonth = () => {
    if (initialTargetMonthYear) return parseInt(initialTargetMonthYear.split('-')[1], 10);
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return currentDate.getMonth() + 1;
  };

  const [selectedYear, setSelectedYear] = useState<number>(getInitialYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(getInitialMonth());

  useEffect(() => {
    const newTargetMonthYear = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    onMonthYearChange(newTargetMonthYear);
  }, [selectedYear, selectedMonth, onMonthYearChange]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => 2025 + i).reverse(); // From 2025 up to current year
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value, 10));
  };

  const [minYear, minMonth] = earliestMonthYear.split('-').map(Number);
  const [maxYear, maxMonth] = latestMonthYear 
    ? latestMonthYear.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1];

  return (
    <div className={`flex items-center space-x-2 p-2 bg-gray-100 rounded-md shadow ${className}`}>
      <select
        value={selectedYear}
        onChange={handleYearChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        // Conceptual theme usage: theme.typography.fontSize.base, theme.colors.primary for focus
      >
        {years.map((year) => (
          <option key={year} value={year} disabled={year < minYear || year > maxYear}>
            {year}
          </option>
        ))}
      </select>
      <select
        value={selectedMonth}
        onChange={handleMonthChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
      >
        {months.map((month) => {
          const isDisabled = 
            (selectedYear === minYear && month < minMonth) ||
            (selectedYear === maxYear && month > maxMonth);
          return (
            <option key={month} value={month} disabled={isDisabled}>
              {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
            </option>
          );
        })}
      </select>
      {/* Styling conceptual notes:
          Overall div: padding: theme.spacing.md (p-2 is an approximation)
          Selects: theme.typography.fontSize.base (text-sm), theme.colors.primary for focus ring
      */}
    </div>
  );
};

export default MonthYearPicker; 