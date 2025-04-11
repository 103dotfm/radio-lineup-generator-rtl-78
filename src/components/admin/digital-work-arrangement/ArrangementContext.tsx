
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { Shift, CustomRow, WorkArrangement, ShiftData } from './types';

interface ArrangementContextType {
  arrangement: WorkArrangement | null;
  shifts: Shift[];
  customRows: CustomRow[];
  weekDate: Date;
  loading: boolean;
  currentSection: string;
  setArrangement: (arrangement: WorkArrangement | null) => void;
  setShifts: (shifts: Shift[]) => void;
  setCustomRows: (customRows: CustomRow[]) => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  setWeekDate: (date: Date) => void;
  setLoading: (loading: boolean) => void;
  setCurrentSection: (section: string) => void;
  updateShift: (id: string, updatedShift: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  updateCustomRow: (id: string, updatedRow: Partial<CustomRow>) => void;
  deleteCustomRow: (id: string) => void;
  formatDateRange: () => string;
}

const ArrangementContext = createContext<ArrangementContextType | undefined>(undefined);

export const useArrangement = () => {
  const context = useContext(ArrangementContext);
  if (!context) {
    throw new Error('useArrangement must be used within an ArrangementProvider');
  }
  return context;
};

export const ArrangementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekDate, setWeekDate] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  const [currentSection, setCurrentSection] = useState('digital_shifts');

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekDate(prev => {
      const newDate = direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      return startOfWeek(newDate, { weekStartsOn: 0 });
    });
  };

  const updateShift = (id: string, updatedShift: Partial<Shift>) => {
    setShifts(shifts.map(shift => 
      shift.id === id ? { ...shift, ...updatedShift } : shift
    ));
  };

  const deleteShift = (id: string) => {
    setShifts(shifts.filter(shift => shift.id !== id));
  };

  const updateCustomRow = (id: string, updatedRow: Partial<CustomRow>) => {
    setCustomRows(customRows.map(row => 
      row.id === id ? { ...row, ...updatedRow } : row
    ));
  };

  const deleteCustomRow = (id: string) => {
    setCustomRows(customRows.filter(row => row.id !== id));
  };

  const formatDateRange = () => {
    // This function formats the date range for display
    const startDay = format(weekDate, 'dd');
    const endDate = new Date(weekDate);
    endDate.setDate(endDate.getDate() + 5);
    const endDay = format(endDate, 'dd');
    const month = format(weekDate, 'MMMM yyyy');
    return `${endDay}-${startDay} ${month}`;
  };

  const value = {
    arrangement,
    shifts,
    customRows,
    weekDate,
    loading,
    currentSection,
    setArrangement,
    setShifts,
    setCustomRows,
    navigateWeek,
    setWeekDate,
    setLoading,
    setCurrentSection,
    updateShift,
    deleteShift,
    updateCustomRow,
    deleteCustomRow,
    formatDateRange
  };

  return (
    <ArrangementContext.Provider value={value}>
      {children}
    </ArrangementContext.Provider>
  );
};
