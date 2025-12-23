import { lazy } from 'react';

// Lazy load FullCalendar components
export const lazyFullCalendar = {
  FullCalendar: () => import('@fullcalendar/react'),
  DayGrid: () => import('@fullcalendar/daygrid'),
  TimeGrid: () => import('@fullcalendar/timegrid'),
  List: () => import('@fullcalendar/list'),
  Interaction: () => import('@fullcalendar/interaction')
};

// Helper function to load FullCalendar functionality
export const loadFullCalendar = async () => {
  const [FullCalendar, DayGrid, TimeGrid, List, Interaction] = await Promise.all([
    lazyFullCalendar.FullCalendar(),
    lazyFullCalendar.DayGrid(),
    lazyFullCalendar.TimeGrid(),
    lazyFullCalendar.List(),
    lazyFullCalendar.Interaction()
  ]);
  
  return {
    FullCalendar: FullCalendar.default,
    dayGridPlugin: DayGrid.default,
    timeGridPlugin: TimeGrid.default,
    listPlugin: List.default,
    interactionPlugin: Interaction.default
  };
};

