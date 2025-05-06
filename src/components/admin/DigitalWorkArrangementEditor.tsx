
// In the renderShiftCell function in DigitalWorkArrangementEditor.tsx, update the WorkerSelector component to use the workers array

const renderShiftCell = (section: string, day: number, shiftType: string) => {
  const cellShifts = getShiftsForCell(section, day, shiftType);
  if (cellShifts.length === 0) {
    return <TableCell className="p-2 border text-center align-top">
        <Button variant="ghost" size="sm" onClick={() => {
        setNewShiftData({
          ...newShiftData,
          section_name: section,
          day_of_week: day,
          shift_type: shiftType,
          start_time: DEFAULT_SHIFT_TIMES[shiftType].start,
          end_time: DEFAULT_SHIFT_TIMES[shiftType].end
        });
        setEditingShift(null);
        setShiftDialogOpen(true);
      }} className="w-full h-full min-h-[60px] flex items-center justify-center">
          <Plus className="h-4 w-4 opacity-50" />
        </Button>
      </TableCell>;
  }
  return <TableCell className="p-2 border align-top">
      {cellShifts.map(shift => <div key={shift.id} className={`mb-2 p-2 rounded ${shift.is_hidden ? 'opacity-50' : ''}`}>
          <div className="flex justify-between items-center mb-1">
            <div className={`text-xs ${shift.is_custom_time ? 'font-bold digital-shift-irregular-hours' : ''}`}>
              {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border border-border">
                <DropdownMenuItem onClick={() => openShiftDialog(shift)}>
                  <Edit className="mr-2 h-4 w-4" />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteShift(shift.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-2">
            <WorkerSelector 
              value={shift.person_name} 
              onChange={(workerId, additionalText) => updateShiftWorker(shift, workerId, additionalText)} 
              additionalText={shift.additional_text || ''} 
              placeholder="בחר עובד..." 
              className="w-full"
              workers={workers} 
            />
          </div>
        </div>)}
    </TableCell>;
};

// Also update the WorkerSelector in the handleSaveShift dialog form
<div className="grid grid-cols-4 items-center gap-4">
  <Label className="text-right" htmlFor="person-name">עובד</Label>
  <div className="col-span-3">
    <WorkerSelector 
      value={newShiftData.person_name || null} 
      onChange={(value, additionalText) => setNewShiftData({
        ...newShiftData,
        person_name: value || '',
        additional_text: additionalText || ''
      })} 
      additionalText={newShiftData.additional_text} 
      placeholder="בחר עובד..." 
      workers={workers} 
    />
  </div>
</div>
