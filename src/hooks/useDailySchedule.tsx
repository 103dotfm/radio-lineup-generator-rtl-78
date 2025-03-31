
import { useQuery } from "@tanstack/react-query";
import { getDailySchedule } from "@/lib/supabase/dailySchedule";
import { format } from "date-fns";

export const useDailySchedule = (date: Date) => {
  const { data: scheduleSlots = [], isLoading, error } = useQuery({
    queryKey: ['dailySchedule', format(date, 'yyyy-MM-dd')],
    queryFn: () => getDailySchedule(date),
  });

  return {
    scheduleSlots,
    isLoading,
    error
  };
};
