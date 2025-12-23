import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StorageUsageDisplay } from './StorageUsageDisplay';
import { 
  getStorageUsage, 
  getBackupList, 
  getLogAnalysis, 
  executeCleanup, 
  getCleanupStatus,
  type StorageUsage,
  type BackupList,
  type LogAnalysis
} from '@/lib/api/storage-management';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const CLEANUP_ACTIONS = [
  { id: 'delete-old-backups', label: 'מחק כל הגיבויים מלבד האחרון', description: 'מוחק את כל הגיבויים הישנים ושומר רק את הגיבוי האחרון' },
  { id: 'trim-logs', label: 'קצץ את כל הלוגים', description: 'דוחס לוגים ישנים (מעל 30 יום) ומוחק לוגים מעל 90 יום' },
  { id: 'clear-temp-files', label: 'נקה קבצים זמניים', description: 'מוחק קבצים זמניים מ-/tmp, /var/tmp ותיקיית temp של הפרויקט' },
  { id: 'clear-cache', label: 'נקה מטמון', description: 'מוחק מטמון Node.js, קבצי build, וקבצי .vite' },
  { id: 'clear-sql-files', label: 'נקה קבצי SQL ישנים', description: 'מוחק קבצי SQL ישנים מתיקיית public/sql וקבצי SQL ישנים מהשורש' },
  { id: 'clear-old-storage', label: 'נקה אחסון ישן', description: 'מוחק את תיקיית storage הישנה והעלאות ישנות מ-storage-new' },
  { id: 'clear-system-journal', label: 'נקה יומן מערכת', description: 'מנקה את יומן systemd ושומר רק 30 יום אחרונים' },
  { id: 'clear-editor-files', label: 'נקה קבצי עורך', description: 'מוחק קבצי .DS_Store, Thumbs.db, .swp, .swo, *~' },
  { id: 'clear-old-backup-files', label: 'נקה קבצי גיבוי ישנים', description: 'מוחק קבצי .bak, .old, .backup מהפרויקט' },
  { id: 'clear-nginx-cache', label: 'נקה מטמון Nginx', description: 'מנקה את מטמון Nginx' }
];

export function StorageManagement() {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [cleanupJobId, setCleanupJobId] = useState<string | null>(null);
  const [cleanupResults, setCleanupResults] = useState<any>(null);

  const { data: usage, isLoading: usageLoading, error: usageError, refetch: refetchUsage } = useQuery<StorageUsage>({
    queryKey: ['storage-usage'],
    queryFn: getStorageUsage,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2
  });

  const { data: backups } = useQuery<BackupList>({
    queryKey: ['backup-list'],
    queryFn: getBackupList
  });

  const { data: logs } = useQuery<LogAnalysis>({
    queryKey: ['log-analysis'],
    queryFn: getLogAnalysis
  });

  const cleanupMutation = useMutation({
    mutationFn: executeCleanup,
    onSuccess: (data) => {
      setCleanupJobId(data.jobId);
      toast({
        title: 'ניקוי החל',
        description: 'תהליך הניקוי החל. אנא המתן...'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'שגיאה',
        description: error.message || 'נכשל בהפעלת תהליך הניקוי',
        variant: 'destructive'
      });
    }
  });

  // Poll for cleanup status
  useEffect(() => {
    if (!cleanupJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getCleanupStatus(cleanupJobId);
        
        if (status.status === 'completed') {
          setCleanupResults(status.results);
          setCleanupJobId(null);
          refetchUsage();
          toast({
            title: 'ניקוי הושלם',
            description: `שוחררו ${status.results.totalFreedFormatted || '0 B'}`
          });
        } else if (status.status === 'failed') {
          setCleanupJobId(null);
          toast({
            title: 'ניקוי נכשל',
            description: status.error || 'אירעה שגיאה בתהליך הניקוי',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error checking cleanup status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [cleanupJobId, refetchUsage]);

  const handleActionToggle = (actionId: string) => {
    setSelectedActions(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
    );
  };

  const handleExecute = () => {
    if (selectedActions.length === 0) {
      toast({
        title: 'אזהרה',
        description: 'אנא בחר לפחות פעולה אחת',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm('האם אתה בטוח שברצונך לבצע את הפעולות שנבחרו?')) {
      return;
    }

    cleanupMutation.mutate(selectedActions);
    setSelectedActions([]);
  };

  if (usageLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (usageError || !usage) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-red-800 font-semibold mb-2">לא ניתן לטעון נתוני אחסון</div>
          {usageError && (
            <div className="text-sm text-red-600 mt-2">
              {usageError instanceof Error ? usageError.message : 'שגיאה לא ידועה'}
            </div>
          )}
          <Button 
            onClick={() => refetchUsage()} 
            variant="outline" 
            className="mt-4"
            size="sm"
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold mb-6">ניהול אחסון</h2>
        
        {/* Storage Usage Display */}
        <StorageUsageDisplay usage={usage} className="mb-8" />

        {/* Backup and Log Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">גיבויים</div>
            <div className="text-2xl font-semibold">{backups?.totalCount || 0}</div>
            <div className="text-sm text-slate-500">{backups?.totalSizeFormatted || '0 B'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">לוגים</div>
            <div className="text-2xl font-semibold">{logs?.totalSizeFormatted || '0 B'}</div>
            <div className="text-sm text-slate-500">
              {logs?.pm2AppLogs.length || 0} קבצי לוג
            </div>
          </div>
        </div>

        {/* Cleanup Actions */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">פעולות ניקוי</h3>
          <div className="space-y-3 mb-6">
            {CLEANUP_ACTIONS.map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                <Checkbox
                  id={action.id}
                  checked={selectedActions.includes(action.id)}
                  onCheckedChange={() => handleActionToggle(action.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={action.id} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {action.label}
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleExecute}
            disabled={selectedActions.length === 0 || cleanupMutation.isPending || cleanupJobId !== null}
            className="w-full"
          >
            {cleanupMutation.isPending || cleanupJobId ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                מבצע ניקוי...
              </>
            ) : (
              'בצע ניקוי'
            )}
          </Button>
        </div>

        {/* Cleanup Results */}
        {cleanupResults && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">תוצאות הניקוי</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">ניקוי הושלם בהצלחה</span>
              </div>
              <div className="text-sm text-green-700">
                שוחררו: {cleanupResults.totalFreedFormatted || '0 B'}
              </div>
              {cleanupResults.errors && cleanupResults.errors.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-red-800 mb-1">שגיאות:</div>
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                    {cleanupResults.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


