import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextareaAutosize,
} from '@mui/material';
import { styled } from '@mui/system';
import { MoreVert as MoreVertIcon, Delete as DeleteIcon, Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/he';
import localeData from 'dayjs/plugin/localeData';
import isBetween from 'dayjs/plugin/isBetween';
import { debounce } from 'lodash';

dayjs.extend(localeData);
dayjs.extend(isBetween);
dayjs.locale('he');

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  additional_text: string;
}

interface CustomRow {
  id: string;
  name: string;
  content?: string;
  contents?: string[];
  is_header: boolean;
  is_bold: boolean;
  is_double: boolean;
  is_hidden: boolean;
  is_shift: boolean;
  shift_id?: string | null;
  order: number;
}

interface DigitalWorkArrangementData {
  id: string;
  name: string;
  date: string;
  columns: number;
  custom_rows: CustomRow[];
  shifts: Shift[];
  comic_prompt: string;
}

interface Props {
  supabase: SupabaseClient;
}

const StyledTableContainer = styled(TableContainer)({
  margin: '20px 0',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
});

const StyledTable = styled(Table)({
  minWidth: 700,
});

const StyledTableCell = styled(TableCell)({
  fontWeight: 'bold',
  backgroundColor: '#f5f5f5',
});

const StyledTableRow = styled(TableRow)({
  '&:nth-of-type(odd)': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
});

const DigitalWorkArrangement: React.FC<Props> = ({ supabase }) => {
  const [dataArr, setDataArr] = useState<DigitalWorkArrangementData | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [columns, setColumns] = useState(1);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<CustomRow | null>(null);
  const [comicPrompt, setComicPrompt] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isShiftEditMode, setIsShiftEditMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogType, setDialogType] = useState<'row' | 'shift'>('row');
  const [newRowName, setNewRowName] = useState('');
  const [newRowContent, setNewRowContent] = useState('');
  const [newRowContents, setNewRowContents] = useState<string[]>([]);
  const [newRowIsHeader, setNewRowIsHeader] = useState(false);
  const [newRowIsBold, setNewRowIsBold] = useState(false);
  const [newRowIsDouble, setNewRowIsDouble] = useState(false);
  const [newRowIsHidden, setNewRowIsHidden] = useState(false);
  const [newRowIsShift, setNewRowIsShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStartTime, setNewShiftStartTime] = useState('');
  const [newShiftEndTime, setNewShiftEndTime] = useState('');
  const [newShiftAdditionalText, setNewShiftAdditionalText] = useState('');
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isComicPromptDialogOpen, setIsComicPromptDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('digital_work_arrangements')
        .select(`
          id,
          name,
          date,
          columns,
          comic_prompt,
          custom_rows (
            id,
            name,
            content,
            contents,
            is_header,
            is_bold,
            is_double,
            is_hidden,
            is_shift,
            shift_id,
            order
          ),
          shifts (
            id,
            name,
            start_time,
            end_time,
            additional_text
          )
        `)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setDataArr(data);
        setName(data.name);
        setDate(dayjs(data.date));
        setColumns(data.columns);

        // Ensure custom_rows is an array and map it
        const mappedCustomRows = Array.isArray(data.custom_rows) ? data.custom_rows.map(row => ({
          ...row,
          contents: row.contents ? JSON.parse(JSON.stringify(row.contents)) : [],
        })) : [];
        setCustomRows(mappedCustomRows);

        // Ensure content/contents handling
        const firstRow = mappedCustomRows[0];
        if (firstRow) {
          if (firstRow.contents && Array.isArray(firstRow.contents)) {
            // console.log('First row contents:', firstRow.contents);
          } else if (firstRow.content) {
            // console.log('First row content:', firstRow.content);
          }
        }

        // Fix the shifts array type issue by ensuring additional_text is present
        const mappedShifts = data.shifts.map(shift => ({
          ...shift,
          additional_text: shift.additional_text || "" // Add the missing additional_text property with default empty string
        }));
        setShifts(mappedShifts);

        // Setting comic_prompt value with default value
        const comicPrompt = data?.comic_prompt || "";
        setComicPrompt(comicPrompt);
      } else {
        setDataArr(null);
        setName('');
        setDate(dayjs());
        setColumns(1);
        setCustomRows([]);
        setShifts([]);
        setComicPrompt('');
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error(`Error fetching data: ${err.message}`);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: CustomRow) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleEditRow = (row: CustomRow) => {
    setDialogType('row');
    setSelectedRow(row);
    setNewRowName(row.name);
    setNewRowContent(row.content || '');
    setNewRowContents(row.contents || []);
    setNewRowIsHeader(row.is_header);
    setNewRowIsBold(row.is_bold);
    setNewRowIsDouble(row.is_double);
    setNewRowIsHidden(row.is_hidden);
    setNewRowIsShift(row.is_shift);
    setSelectedShift(row.shift_id || null);
    setIsEditMode(true);
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('custom_rows')
        .delete()
        .eq('id', rowId);

      if (error) {
        throw error;
      }

      setCustomRows(prevRows => prevRows.filter(row => row.id !== rowId));
      toast.success('Row deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting row:', err);
      toast.error(`Error deleting row: ${err.message}`);
    } finally {
      handleMenuClose();
    }
  };

  const handleOpenDialog = (type: 'row' | 'shift') => {
    setDialogType(type);
    setNewRowName('');
    setNewRowContent('');
    setNewRowContents(Array(columns).fill(''));
    setNewRowIsHeader(false);
    setNewRowIsBold(false);
    setNewRowIsDouble(false);
    setNewRowIsHidden(false);
    setNewRowIsShift(false);
    setSelectedShift(null);
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedColumnIndex(null);
  };

  const handleOpenShiftDialog = () => {
    setNewShiftName('');
    setNewShiftStartTime('');
    setNewShiftEndTime('');
    setNewShiftAdditionalText('');
    setIsShiftEditMode(false);
    setOpenShiftDialog(true);
  };

  const handleCloseShiftDialog = () => {
    setOpenShiftDialog(false);
  };

  const handleSaveRow = async () => {
    if (!newRowName.trim()) {
      toast.error('Row name is required!');
      return;
    }

    try {
      setIsSaving(true);
      const rowData = {
        name: newRowName,
        content: newRowContent || null,
        contents: newRowContents.filter(content => content !== null && content !== ''),
        is_header: newRowIsHeader,
        is_bold: newRowIsBold,
        is_double: newRowIsDouble,
        is_hidden: newRowIsHidden,
        is_shift: newRowIsShift,
        shift_id: newRowIsShift ? selectedShift : null,
        order: selectedRow?.order || customRows.length,
      };

      if (isEditMode && selectedRow) {
        const { data, error } = await supabase
          .from('custom_rows')
          .update(rowData)
          .eq('id', selectedRow.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setCustomRows(prevRows =>
          prevRows.map(row => (row.id === selectedRow.id ? { ...row, ...rowData } : row))
        );
        toast.success('Row updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('custom_rows')
          .insert([{ ...rowData, digital_work_arrangement_id: dataArr?.id, id: uuidv4() }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        setCustomRows(prevRows => [...prevRows, data]);
        toast.success('Row added successfully!');
      }

      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving row:', err);
      toast.error(`Error saving row: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShift = async () => {
    if (!newShiftName.trim() || !newShiftStartTime.trim() || !newShiftEndTime.trim()) {
      toast.error('Shift name, start time, and end time are required!');
      return;
    }

    try {
      setIsSaving(true);
      const shiftData = {
        name: newShiftName,
        start_time: newShiftStartTime,
        end_time: newShiftEndTime,
        additional_text: newShiftAdditionalText,
      };

      if (isShiftEditMode && selectedRow?.shift_id) {
        const { data, error } = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', selectedRow.shift_id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setShifts(prevShifts =>
          prevShifts.map(shift => (shift.id === selectedRow.shift_id ? { ...shift, ...shiftData } : shift))
        );
        toast.success('Shift updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('shifts')
          .insert([{ ...shiftData, digital_work_arrangement_id: dataArr?.id, id: uuidv4() }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Ensure additional_text is present
        const newShift = { ...data, additional_text: data.additional_text || "" };
        setShifts(prevShifts => [...prevShifts, newShift]);
        toast.success('Shift added successfully!');
      }

      handleCloseShiftDialog();
    } catch (err: any) {
      console.error('Error saving shift:', err);
      toast.error(`Error saving shift: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setDialogType('shift');
    setSelectedRow({
      id: uuidv4(),
      name: shift.name,
      is_header: false,
      is_bold: false,
      is_double: false,
      is_hidden: false,
      is_shift: true,
      shift_id: shift.id,
      order: customRows.length,
    });
    setNewShiftName(shift.name);
    setNewShiftStartTime(shift.start_time);
    setNewShiftEndTime(shift.end_time);
    setNewShiftAdditionalText(shift.additional_text);
    setIsShiftEditMode(true);
    setOpenShiftDialog(true);
    handleMenuClose();
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) {
        throw error;
      }

      setShifts(prevShifts => prevShifts.filter(shift => shift.id !== shiftId));
      toast.success('Shift deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting shift:', err);
      toast.error(`Error deleting shift: ${err.message}`);
    } finally {
      handleMenuClose();
    }
  };

  const handleSaveData = debounce(async () => {
    if (!name.trim()) {
      toast.error('Name is required!');
      return;
    }

    try {
      setIsSaving(true);
      const dateStr = date ? date.format('YYYY-MM-DD') : '';

      const dataToSave = {
        name: name,
        date: dateStr,
        columns: columns,
        comic_prompt: comicPrompt,
      };

      if (dataArr) {
        const { data, error } = await supabase
          .from('digital_work_arrangements')
          .update(dataToSave)
          .eq('id', dataArr.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setDataArr(data);
        toast.success('Data updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('digital_work_arrangements')
          .insert([{ ...dataToSave, id: uuidv4() }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        setDataArr(data);
        toast.success('Data saved successfully!');
      }
    } catch (err: any) {
      console.error('Error saving data:', err);
      toast.error(`Error saving data: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, 500);

  useEffect(() => {
    if (dataArr) {
      handleSaveData();
    }
  }, [name, date, columns, comicPrompt, handleSaveData, dataArr]);

  const handleOnDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(customRows);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property of each item
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setCustomRows(updatedItems);

    try {
      setIsSaving(true);
      // Update the order in the database
      for (const item of updatedItems) {
        const { error } = await supabase
          .from('custom_rows')
          .update({ order: item.order })
          .eq('id', item.id);

        if (error) {
          throw error;
        }
      }
      toast.success('Order updated successfully!');
    } catch (err: any) {
      console.error('Error updating order:', err);
      toast.error(`Error updating order: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColumn = () => {
    setColumns(prevColumns => prevColumns + 1);
    setNewRowContents(prevContents => [...prevContents, '']);
  };

  const handleRemoveColumn = () => {
    if (columns > 1) {
      setColumns(prevColumns => prevColumns - 1);
      setNewRowContents(prevContents => {
        const newContents = [...prevContents];
        newContents.pop();
        return newContents;
      });
    }
  };

  const handleColumnContentChange = (index: number, value: string) => {
    setNewRowContents(prevContents => {
      const newContents = [...prevContents];
      newContents[index] = value;
      return newContents;
    });
  };

  const handleOpenShiftDialogFromRow = (row: CustomRow) => {
    setDialogType('shift');
    setSelectedRow(row);
    setNewShiftName('');
    setNewShiftStartTime('');
    setNewShiftEndTime('');
    setNewShiftAdditionalText('');
    setIsShiftEditMode(false);
    setOpenShiftDialog(true);
    handleMenuClose();
  };

  const handleToggleShiftDialog = () => {
    setIsShiftDialogOpen(!isShiftDialogOpen);
  };

  const handleToggleComicPromptDialog = () => {
    setIsComicPromptDialogOpen(!isComicPromptDialogOpen);
  };

  const renderTableCellContent = (customRow: CustomRow, columnIndex: number) => {
    if (customRow.contents && customRow.contents[columnIndex]) {
      return String(customRow.contents[columnIndex]);
    } else if (customRow.content) {
      return customRow.content;
    } else {
      return "";
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} locale="he">
      <div>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          fullWidth
        />
        <DatePicker
          label="Date"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          format="DD/MM/YYYY"
          sx={{ margin: '20px 0' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
          <TextField
            label="Columns"
            type="number"
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            margin="normal"
            sx={{ width: '100px', marginRight: '10px' }}
          />
          <Button variant="contained" color="primary" onClick={handleAddColumn} disabled={isSaving}>
            Add Column
          </Button>
          <Button variant="contained" color="secondary" onClick={handleRemoveColumn} disabled={isSaving}>
            Remove Column
          </Button>
        </div>

        <Button
          variant="contained"
          color="primary"
          onClick={handleToggleComicPromptDialog}
          style={{ marginTop: '20px' }}
          disabled={isSaving}
        >
          {comicPrompt ? 'Edit Comic Prompt' : 'Add Comic Prompt'}
        </Button>

        <Dialog open={isComicPromptDialogOpen} onClose={handleToggleComicPromptDialog} fullWidth maxWidth="md">
          <DialogTitle>Comic Prompt</DialogTitle>
          <DialogContent>
            <TextField
              label="Comic Prompt"
              multiline
              rows={4}
              fullWidth
              value={comicPrompt}
              onChange={(e) => setComicPrompt(e.target.value)}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleToggleComicPromptDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleToggleComicPromptDialog} color="primary" disabled={isSaving}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog('row')}
          style={{ marginTop: '20px' }}
          disabled={isSaving}
        >
          Add Row
        </Button>

        <StyledTableContainer component={Paper}>
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="customRows">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <StyledTable aria-label="custom table">
                    <TableHead>
                      <TableRow>
                        <StyledTableCell>Name</StyledTableCell>
                        {Array.from({ length: columns }, (_, i) => (
                          <StyledTableCell key={i}>Column {i + 1}</StyledTableCell>
                        ))}
                        <StyledTableCell align="right">Actions</StyledTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customRows.map((customRow, index) => (
                        <Draggable key={customRow.id} draggableId={customRow.id} index={index} isDragDisabled={isSaving}>
                          {(provided) => (
                            <StyledTableRow
                              key={customRow.id}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              ref={provided.innerRef}
                              style={{
                                ...provided.draggableProps.style,
                                fontWeight: customRow.is_bold ? 'bold' : 'normal',
                                display: customRow.is_hidden ? 'none' : 'table-row',
                                backgroundColor: customRow.is_header ? '#e0e0e0' : 'inherit',
                                fontSize: customRow.is_double ? '1.2em' : '1em',
                              }}
                            >
                              <TableCell component="th" scope="row">
                                {customRow.name}
                              </TableCell>
                              {Array.from({ length: columns }, (_, i) => (
                                <TableCell key={i}>
                                  {renderTableCellContent(customRow, i)}
                                </TableCell>
                              ))}
                              <TableCell align="right">
                                <IconButton
                                  aria-label="more"
                                  aria-controls={`row-menu-${customRow.id}`}
                                  aria-haspopup="true"
                                  onClick={(e) => handleMenuOpen(e, customRow)}
                                  disabled={isSaving}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </TableCell>
                            </StyledTableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </StyledTable>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </StyledTableContainer>

        <Menu
          id={`row-menu-${selectedRow?.id}`}
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => selectedRow && handleEditRow(selectedRow)} disabled={isSaving}>
            <EditIcon style={{ marginRight: '8px' }} /> Edit
          </MenuItem>
          <MenuItem onClick={() => selectedRow && handleDeleteRow(selectedRow.id)} disabled={isSaving}>
            <DeleteIcon style={{ marginRight: '8px' }} /> Delete
          </MenuItem>
          <MenuItem onClick={() => selectedRow && handleOpenShiftDialogFromRow(selectedRow)} disabled={isSaving}>
            <AddIcon style={{ marginRight: '8px' }} /> Add Shift
          </MenuItem>
          <MenuItem onClick={handleToggleShiftDialog} disabled={isSaving}>
            <AddIcon style={{ marginRight: '8px' }} /> Manage Shifts
          </MenuItem>
        </Menu>

        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
          <DialogTitle>{isEditMode ? 'Edit Row' : 'Add Row'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Row Name"
              value={newRowName}
              onChange={(e) => setNewRowName(e.target.value)}
              margin="normal"
              fullWidth
            />
            {Array.from({ length: columns }, (_, i) => (
              <TextField
                key={i}
                label={`Column ${i + 1} Content`}
                value={newRowContents[i] || ''}
                onChange={(e) => {
                  handleColumnContentChange(i, e.target.value);
                }}
                margin="normal"
                fullWidth
              />
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '16px' }}>
              <FormControlLabel
                control={<Checkbox checked={newRowIsHeader} onChange={(e) => setNewRowIsHeader(e.target.checked)} />}
                label="Is Header"
              />
              <FormControlLabel
                control={<Checkbox checked={newRowIsBold} onChange={(e) => setNewRowIsBold(e.target.checked)} />}
                label="Is Bold"
              />
              <FormControlLabel
                control={<Checkbox checked={newRowIsDouble} onChange={(e) => setNewRowIsDouble(e.target.checked)} />}
                label="Is Double Size"
              />
              <FormControlLabel
                control={<Checkbox checked={newRowIsHidden} onChange={(e) => setNewRowIsHidden(e.target.checked)} />}
                label="Is Hidden"
              />
              <FormControlLabel
                control={<Checkbox checked={newRowIsShift} onChange={(e) => setNewRowIsShift(e.target.checked)} />}
                label="Is Shift"
              />
            </div>
            {newRowIsShift && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="shift-select-label">Select Shift</InputLabel>
                <Select
                  labelId="shift-select-label"
                  id="shift-select"
                  value={selectedShift || ''}
                  label="Select Shift"
                  onChange={(e) => setSelectedShift(e.target.value as string)}
                >
                  {shifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRow} color="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openShiftDialog} onClose={handleCloseShiftDialog} fullWidth maxWidth="md">
          <DialogTitle>{isShiftEditMode ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          <DialogContent>
            <TextField
              label="Shift Name"
              value={newShiftName}
              onChange={(e) => setNewShiftName(e.target.value)}
              margin="normal"
              fullWidth
            />
            <TextField
              label="Start Time"
              value={newShiftStartTime}
              onChange={(e) => setNewShiftStartTime(e.target.value)}
              margin="normal"
              fullWidth
            />
            <TextField
              label="End Time"
              value={newShiftEndTime}
              onChange={(e) => setNewShiftEndTime(e.target.value)}
              margin="normal"
              fullWidth
            />
            <TextField
              label="Additional Text"
              value={newShiftAdditionalText}
              onChange={(e) => setNewShiftAdditionalText(e.target.value)}
              margin="normal"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseShiftDialog} color="primary" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveShift} color="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isShiftDialogOpen} onClose={handleToggleShiftDialog} fullWidth maxWidth="md">
          <DialogTitle>Manage Shifts</DialogTitle>
          <DialogContent>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenShiftDialog}
              style={{ marginBottom: '16px' }}
              disabled={isSaving}
            >
              Add Shift
            </Button>
            <TableContainer component={Paper}>
              <Table aria-label="shifts table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Additional Text</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>{shift.name}</TableCell>
                      <TableCell>{shift.start_time}</TableCell>
                      <TableCell>{shift.end_time}</TableCell>
                      <TableCell>{shift.additional_text}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="edit"
                          onClick={() => handleEditShift(shift)}
                          disabled={isSaving}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          onClick={() => handleDeleteShift(shift.id)}
                          disabled={isSaving}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleToggleShiftDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </LocalizationProvider>
  );
};

export default DigitalWorkArrangement;
