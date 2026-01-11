import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus, X, ArrowLeft, Edit, Trash2 } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Phone number formatting function from lineup form
const formatPhoneNumber = (value: string) => {
  // Remove all non-digit characters
  let cleaned = value.replace(/\D/g, '');

  // Replace +972 with 0
  if (cleaned.startsWith('972')) {
    cleaned = '0' + cleaned.slice(3);
  }

  // Add dash after third digit if there are more than 3 digits
  if (cleaned.length > 3) {
    cleaned = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
  }

  return cleaned;
};

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

const statusOptions = [
  { value: "waiting", label: "ממתינ/ה להזמנה לאיסוף", color: "bg-red-100" },
  { value: "invited", label: "קיבל/ה הזמנה לאיסוף", color: "bg-orange-100" },
  { value: "נמסר!", label: "נמסר!", color: "bg-green-100" },
];

const PrizesManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [newEntry, setNewEntry] = useState({
    full_name: "",
    phone_number: "",
    prizes: [""],
    status: "waiting",
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [inlineEditing, setInlineEditing] = useState({ id: null, field: null });
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState({});
  const autocompleteRefs = useRef({});

  const { data: prizesData, isLoading: prizesLoading, isError: prizesError, error: prizesErr } = useQuery({
    queryKey: ["prizes"],
    queryFn: () => api.get("/prizes").then((res) => res.data),
  });

  const { data: uniquePrizesData, isLoading: uniqueLoading, isError: uniqueError, error: uniqueErr } = useQuery({
    queryKey: ["uniquePrizes"],
    queryFn: () => api.get("/prizes/unique").then((res) => res.data),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/prizes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      setNewEntry({ full_name: "", phone_number: "", prizes: [""], status: "waiting", notes: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) => api.patch(`/prizes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prizes"] });
      setEditingId(null);
      setNewEntry({ full_name: "", phone_number: "", prizes: [""], status: "waiting", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => api.delete(`/prizes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prizes"] }),
  });

  const prizes = Array.isArray(prizesData) ? prizesData : [];
  const uniquePrizes = Array.isArray(uniquePrizesData) ? uniquePrizesData : [];

  const handleAddPrize = () => {
    setNewEntry({ ...newEntry, prizes: [...newEntry.prizes, ""] });
  };

  const handleRemovePrize = (idx: number) => {
    const newPrizes = newEntry.prizes.filter((_, i) => i !== idx);
    setNewEntry({ ...newEntry, prizes: newPrizes });
  };

  const handlePrizeChange = (idx: number, value: string) => {
    const newPrizes = [...newEntry.prizes];
    newPrizes[idx] = value;
    setNewEntry({ ...newEntry, prizes: newPrizes });
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: newEntry });
    } else {
      addMutation.mutate(newEntry);
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setNewEntry({
      full_name: p.full_name,
      phone_number: p.phone_number,
      prizes: [...p.prizes],
      status: p.status,
      notes: p.notes,
    });
  };

  const handleComplete = (id: string, completed: boolean | string) => {
    const p = prizes.find((pr: any) => pr.id === id);
    const newData = { ...p, completed: !!completed };
    if (completed) {
      newData.status = "נמסר!";
    } else {
      newData.status = "ממתינ/ה להזמנה לאיסוף";
    }
    updateMutation.mutate({ id, data: newData });
  };

  const handleInlineEdit = (id: string, field: string, value: string) => {
    const p = prizes.find((pr: any) => pr.id === id);
    updateMutation.mutate({ id, data: { ...p, [field]: value } });
    setInlineEditing({ id: null, field: null });
    setInlineEditValue("");
  };

  const handleInlineEditStart = (id: string, field: string, currentValue: string) => {
    setInlineEditing({ id, field });
    setInlineEditValue(currentValue || "");
  };

  const handleInlineEditSave = () => {
    if (inlineEditing.id && inlineEditing.field) {
      handleInlineEdit(inlineEditing.id, inlineEditing.field, inlineEditValue);
    }
  };

  const handleInlineEditCancel = () => {
    setInlineEditing({ id: null, field: null });
    setInlineEditValue("");
  };

  const handleAutocompleteClick = (idx: number, value: string) => {
    handlePrizeChange(idx, value);
    setShowAutocomplete(prev => ({ ...prev, [idx]: false }));
  };

  const handleAutocompleteBlur = (idx: number) => {
    setTimeout(() => {
      setShowAutocomplete(prev => ({ ...prev, [idx]: false }));
    }, 200);
  };

  // Sort prizes: completed items go to bottom
  const sortedPrizes = [...prizes].sort((a: any, b: any) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  if (prizesLoading || uniqueLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-in">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-lg font-bold text-slate-400">טוען נתונים...</div>
        </div>
      </div>
    );
  }

  if (prizesError || uniqueError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-card rounded-3xl gap-4 text-red-500 font-bold p-8 animate-in">
        <X className="h-12 w-12" />
        <div className="text-xl">שגיאה בטעינת הנתונים: {prizesErr?.message || uniqueErr?.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-800">ניהול פרסים</h1>
          <p className="text-slate-500 font-medium">ניהול ומעקב אחר חלוקת פרסים למאזינים</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-xl h-11 px-6 border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          חזרה ללוח הבקרה
        </Button>
      </div>

      <div className="glass-card p-8 rounded-3xl border-none premium-shadow space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
            {editingId ? "✎" : "+"}
          </span>
          {editingId ? "עריכת פרס" : "הוספת פרס חדש"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 px-1">שם המאזין/ה</label>
            <Input
              placeholder="שם מלא..."
              value={newEntry.full_name}
              onChange={(e) => setNewEntry({ ...newEntry, full_name: e.target.value })}
              className="rounded-xl h-12 bg-white/50 border-slate-100 focus:border-primary/30 transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 px-1">מספר טלפון</label>
            <Input
              placeholder="05X-XXXXXXX"
              value={newEntry.phone_number}
              onChange={(e) => {
                const formattedPhone = formatPhoneNumber(e.target.value);
                setNewEntry({ ...newEntry, phone_number: formattedPhone });
              }}
              type="tel"
              autoComplete="off"
              className="rounded-xl h-12 bg-white/50 border-slate-100 focus:border-primary/30 transition-all font-medium text-left"
              dir="ltr"
            />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-4">
            <label className="text-sm font-bold text-slate-600 px-1">פרסים לזכייה</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {newEntry.prizes.map((pr, idx) => (
                <div key={idx} className="group relative flex items-center gap-2 animate-in slide-in-from-right-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="הקלד שם פרס..."
                      value={pr}
                      onChange={(e) => {
                        handlePrizeChange(idx, e.target.value);
                        setShowAutocomplete(prev => ({ ...prev, [idx]: true }));
                      }}
                      onFocus={() => setShowAutocomplete(prev => ({ ...prev, [idx]: true }))}
                      onBlur={() => handleAutocompleteBlur(idx)}
                      className="rounded-xl h-11 bg-white/80 border-slate-100 focus:border-primary/30 transition-all pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                      🎁
                    </div>
                    {showAutocomplete[idx] && uniquePrizes.length > 0 && (
                      <div className="absolute z-50 w-full bg-white/95 backdrop-blur-md border border-slate-100 rounded-xl shadow-xl mt-2 overflow-hidden animate-in fade-in zoom-in-95">
                        {uniquePrizes
                          .filter(up => up.toLowerCase().includes(pr.toLowerCase()))
                          .slice(0, 5)
                          .map((suggestion, suggestionIdx) => (
                            <div
                              key={suggestionIdx}
                              className="px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors font-medium text-slate-700"
                              onClick={() => handleAutocompleteClick(idx, suggestion)}
                            >
                              {suggestion}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePrize(idx)}
                    className="h-11 w-11 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleAddPrize}
              className="w-full sm:w-auto rounded-xl h-11 border-dashed border-2 border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-bold gap-2"
            >
              <Plus className="h-4 w-4" /> הוסף פרס נוסף
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 px-1">סטטוס הזמנה</label>
            <Select
              value={newEntry.status}
              onValueChange={(v) => setNewEntry({ ...newEntry, status: v })}
            >
              <SelectTrigger className="rounded-xl h-12 bg-white/50 border-slate-100 font-medium">
                <SelectValue placeholder="בחר סטטוס..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="py-3 font-medium">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 px-1">הערות</label>
            <Input
              placeholder="מידע נוסף..."
              value={newEntry.notes}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              className="rounded-xl h-12 bg-white/50 border-slate-100 focus:border-primary/30 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-3">
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setNewEntry({ full_name: "", phone_number: "", prizes: [""], status: "waiting", notes: "" });
              }}
              className="rounded-xl h-12 px-8 font-bold text-slate-400"
            >
              ביטול
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            className="rounded-xl h-12 px-12 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {editingId ? "שמור שינויים" : "הוסף מאזין לזכייה"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Input
            placeholder="חיפוש לפי שם או פרס..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl h-12 bg-white border-slate-200 px-12 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </div>
        </div>

        <div className="glass-card rounded-3xl border-none premium-shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                <TableHead className="text-right h-14 font-black text-slate-800">שם מלא</TableHead>
                <TableHead className="h-14 font-black text-slate-800 text-center">מספר טלפון</TableHead>
                <TableHead className="text-right h-14 font-black text-slate-800">פרסים</TableHead>
                <TableHead className="text-right h-14 font-black text-slate-800">סטטוס</TableHead>
                <TableHead className="text-right h-14 font-black text-slate-800">הערות</TableHead>
                <TableHead className="text-center h-14 font-black text-slate-800">תאריך</TableHead>
                <TableHead className="text-center h-14 font-black text-slate-800">בוצע</TableHead>
                <TableHead className="text-left h-14 font-black text-slate-800">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrizes.filter((p: any) =>
                p.full_name.toLowerCase().includes(search.toLowerCase()) ||
                (Array.isArray(p.prizes) && p.prizes.some((prize: any) => prize.toLowerCase().includes(search.toLowerCase())))
              ).map((p: any) => {
                const statusOpt = statusOptions.find((opt) => opt.value === p.status);
                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "group border-b border-slate-50 hover:bg-slate-50/30 transition-colors",
                      p.completed ? "opacity-60 bg-slate-50/50" : ""
                    )}
                  >
                    <TableCell className="text-right font-bold text-slate-700 py-4">{p.full_name}</TableCell>
                    <TableCell className="text-center font-medium text-slate-500 py-4" dir="ltr">{p.phone_number}</TableCell>
                    <TableCell className="text-right py-4">
                      {Array.isArray(p.prizes) ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {p.prizes.map((prize, idx) => (
                            <span key={idx} className="bg-white border border-slate-100 shadow-sm px-2 py-0.5 rounded-lg text-xs font-bold text-slate-600">
                              {prize}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-medium text-slate-600">{p.prizes || ""}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      {inlineEditing.id === p.id && inlineEditing.field === 'status' ? (
                        <Select
                          value={p.status}
                          onValueChange={(value) => handleInlineEdit(p.id, 'status', value)}
                          onOpenChange={(open) => !open && setInlineEditing({ id: null, field: null })}
                        >
                          <SelectTrigger className="h-9 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-none shadow-xl">
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="py-2.5 font-medium">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-black cursor-pointer ring-1 ring-inset transition-all",
                            p.status === 'נמסר!' ? "bg-green-50 text-green-700 ring-green-100" :
                              p.status === 'invited' ? "bg-orange-50 text-orange-700 ring-orange-100" :
                                "bg-red-50 text-red-700 ring-red-100"
                          )}
                          onClick={() => handleInlineEditStart(p.id, 'status', p.status)}
                        >
                          {statusOpt?.label}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right min-w-[200px] py-4">
                      {inlineEditing.id === p.id && inlineEditing.field === 'notes' ? (
                        <div className="flex gap-1 animate-in slide-in-from-top-1">
                          <Input
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineEditSave();
                              if (e.key === 'Escape') handleInlineEditCancel();
                            }}
                            autoFocus
                            className="h-9 text-sm rounded-lg"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleInlineEditSave}
                            className="h-9 w-9 rounded-lg text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer text-slate-500 text-sm italic hover:text-slate-800 transition-colors"
                          onClick={() => handleInlineEditStart(p.id, 'notes', p.notes)}
                        >
                          {p.notes || 'הוסף הערות...'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="text-[10px] font-black uppercase tracking-tighter text-slate-300">
                        {format(new Date(p.created_at), "dd.MM.yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <Checkbox
                        checked={p.completed}
                        onCheckedChange={(checked) => handleComplete(p.id, checked)}
                        className="rounded-full w-5 h-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                    </TableCell>
                    <TableCell className="text-left py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(p)}
                          className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('בטוח רוצה למחוק?')) deleteMutation.mutate(p.id)
                          }}
                          className="h-9 w-9 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PrizesManagement;
