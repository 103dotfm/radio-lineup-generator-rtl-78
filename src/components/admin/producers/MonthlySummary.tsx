
import React, { useState, useEffect } from 'react';
import { format, getDaysInMonth, parseISO, getMonth, getYear } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getAllMonthlyAssignments, getProducers } from '@/lib/supabase/producers';

const MonthlySummary = () => {
  const { toast } = useToast();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, [year, month]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, producersData] = await Promise.all([
        getAllMonthlyAssignments(year, month),
        getProducers()
      ]);
      
      setAssignments(assignmentsData);
      setProducers(producersData);
    } catch (error) {
      console.error("Error loading monthly summary data:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הסיכום החודשי",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate summary by producer
  const generateSummaryByProducer = () => {
    const summary: Record<string, { producer: any, roles: Record<string, number> }> = {};
    
    // Initialize with all producers
    producers.forEach(producer => {
      summary[producer.id] = {
        producer,
        roles: {}
      };
    });
    
    // Count assignments
    assignments.forEach(assignment => {
      if (!summary[assignment.worker_id]) return;
      
      if (!summary[assignment.worker_id].roles[assignment.role]) {
        summary[assignment.worker_id].roles[assignment.role] = 0;
      }
      
      summary[assignment.worker_id].roles[assignment.role]++;
    });
    
    return Object.values(summary);
  };
  
  // Get all unique roles from assignments
  const getAllRoles = () => {
    const roles = new Set<string>();
    assignments.forEach(assignment => {
      roles.add(assignment.role);
    });
    return Array.from(roles);
  };
  
  const handleExportCSV = () => {
    try {
      const summary = generateSummaryByProducer();
      const roles = getAllRoles();
      
      // Create CSV content
      let csvContent = "שם עובד,תפקיד," + roles.join(",") + ",סה\"כ\n";
      
      summary.forEach(({ producer, roles: roleCounts }) => {
        // Skip producers with no assignments
        if (Object.keys(roleCounts).length === 0) return;
        
        const totalAssignments = Object.values(roleCounts).reduce((a, b) => a + b, 0);
        
        const roleCsvValues = getAllRoles().map(role => roleCounts[role] || 0);
        
        csvContent += `${producer.name},${producer.position || ''},${roleCsvValues.join(",")},${totalAssignments}\n`;
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `סיכום-חודשי-הפקה-${month}-${year}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "הקובץ הורד בהצלחה",
        description: `סיכום חודשי לחודש ${month}/${year} הורד בהצלחה`
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בייצוא הקובץ",
        variant: "destructive"
      });
    }
  };
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    { value: 1, label: "ינואר" },
    { value: 2, label: "פברואר" },
    { value: 3, label: "מרץ" },
    { value: 4, label: "אפריל" },
    { value: 5, label: "מאי" },
    { value: 6, label: "יוני" },
    { value: 7, label: "יולי" },
    { value: 8, label: "אוגוסט" },
    { value: 9, label: "ספטמבר" },
    { value: 10, label: "אוקטובר" },
    { value: 11, label: "נובמבר" },
    { value: 12, label: "דצמבר" }
  ];
  
  const summary = generateSummaryByProducer();
  const uniqueRoles = getAllRoles();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">סיכום חודשי</h3>
        
        <div className="flex space-x-4 space-x-reverse">
          <div className="w-32">
            <Select
              value={month.toString()}
              onValueChange={(value) => setMonth(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="חודש" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-24">
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="שנה" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleExportCSV}>
            <Download className="ml-2 h-4 w-4" />
            ייצוא CSV
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">טוען...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם עובד</TableHead>
                <TableHead>תפקיד</TableHead>
                {uniqueRoles.map(role => (
                  <TableHead key={role}>{role}</TableHead>
                ))}
                <TableHead>סה"כ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + uniqueRoles.length} className="text-center">אין נתונים לחודש זה</TableCell>
                </TableRow>
              ) : (
                summary
                  .filter(item => Object.keys(item.roles).length > 0)
                  .sort((a, b) => a.producer.name.localeCompare(b.producer.name))
                  .map(({ producer, roles }) => {
                    const totalAssignments = Object.values(roles).reduce((a, b) => a + (b as number), 0);
                    
                    return (
                      <TableRow key={producer.id}>
                        <TableCell className="font-medium">{producer.name}</TableCell>
                        <TableCell>{producer.position || '-'}</TableCell>
                        
                        {uniqueRoles.map(role => (
                          <TableCell key={role}>{roles[role] || 0}</TableCell>
                        ))}
                        
                        <TableCell className="font-bold">{totalAssignments}</TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default MonthlySummary;
