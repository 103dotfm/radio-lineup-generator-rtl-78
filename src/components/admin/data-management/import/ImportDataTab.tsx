const { data: scheduleSlots } = await supabase
  .from('schedule_slots')
  .select('*')
  .eq('is_deleted', false)
  .order('day_of_week', { ascending: true })
  .order('start_time', { ascending: true }); 