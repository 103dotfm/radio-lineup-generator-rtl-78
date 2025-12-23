import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Trash2, 
  Upload, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  Clock,
  FileText,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

const BackupRestoreTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [restoreCountdown, setRestoreCountdown] = useState(10);
  const [canConfirmRestore, setCanConfirmRestore] = useState(false);

  // Load backup files
  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backup/list', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load backups');
      }
      
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups);
      } else {
        throw new Error(data.error || 'Failed to load backups');
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      toast.error('שגיאה בטעינת הגיבויים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  // Create backup
  const createBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success('הגיבוי נוצר בהצלחה');
        loadBackups();
      } else {
        throw new Error(data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('שגיאה ביצירת הגיבוי');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Download backup
  const downloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/download/${encodeURIComponent(filename)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('הגיבוי הורד בהצלחה');
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('שגיאה בהורדת הגיבוי');
    }
  };

  // Delete backup
  const deleteBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success('הגיבוי נמחק בהצלחה');
        loadBackups();
      } else {
        throw new Error(data.error || 'Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('שגיאה במחיקת הגיבוי');
    }
  };

  // Restore backup
  const restoreBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/backup/restore/${encodeURIComponent(filename)}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success('הבסיס נתונים שוחזר בהצלחה');
        setShowRestoreDialog(false);
        setSelectedBackup(null);
        setRestoreCountdown(10);
        setCanConfirmRestore(false);
      } else {
        throw new Error(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('שגיאה בשחזור בסיס הנתונים');
    }
  };

  // Upload and restore file
  const uploadAndRestore = async () => {
    if (!selectedFile) return;

    try {
      setUploadingFile(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('sqlFile', selectedFile);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            toast.success('הבסיס נתונים שוחזר בהצלחה מהקובץ שהועלה');
            setShowUploadDialog(false);
            setSelectedFile(null);
            setUploadProgress(0);
          } else {
            throw new Error(response.error || 'Failed to restore from uploaded file');
          }
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('POST', '/api/backup/restore-upload');
      xhr.send(formData);
    } catch (error) {
      console.error('Error uploading and restoring:', error);
      toast.error('שגיאה בהעלאת הקובץ ושחזור');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('he-IL');
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('הקובץ גדול מדי. הגודל המקסימלי הוא 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Start restore countdown
  const startRestoreCountdown = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
    setRestoreCountdown(10);
    setCanConfirmRestore(false);
    
    const interval = setInterval(() => {
      setRestoreCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanConfirmRestore(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Backup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            פעולות גיבוי
          </CardTitle>
          <CardDescription>
            צור גיבוי חדש או העלה קובץ SQL לשחזור
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={createBackup} 
              disabled={creatingBackup}
              className="flex items-center gap-2"
            >
              {creatingBackup ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {creatingBackup ? 'יוצר גיבוי...' : 'גבו עכשיו'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              העלה קובץ SQL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            רשימת גיבויים
          </CardTitle>
          <CardDescription>
            הגיבויים האחרונים של בסיס הנתונים
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="mr-2">טוען גיבויים...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין גיבויים זמינים</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם הקובץ</TableHead>
                    <TableHead>גודל</TableHead>
                    <TableHead>תאריך יצירה</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.filename}>
                      <TableCell className="font-mono text-sm">
                        {backup.filename}
                        {backup.filename.includes('auto-backup') && (
                          <Badge variant="secondary" className="mr-2">אוטומטי</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(backup.size)}</TableCell>
                      <TableCell>{formatDate(backup.created)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadBackup(backup.filename)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startRestoreCountdown(backup)}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackup(backup);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>העלה קובץ SQL</DialogTitle>
            <DialogDescription>
              העלה קובץ SQL לשחזור בסיס הנתונים. פעולה זו תמחק את כל הנתונים הקיימים!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 font-semibold mb-2">אזהרה!</p>
              <p className="text-sm text-gray-600 mb-4">
                שחזור מבסיס נתונים ימחק את כל הנתונים הקיימים ויחליף אותם בנתונים מהקובץ שהועלה.
              </p>
              
              <input
                type="file"
                accept=".sql"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">קובץ נבחר: {selectedFile.name}</p>
                  <p className="text-xs text-gray-500">גודל: {formatFileSize(selectedFile.size)}</p>
                </div>
              )}
              
              {uploadingFile && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="mb-2" />
                  <p className="text-sm text-gray-600">מעלה ומשחזר... {Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={uploadAndRestore}
              disabled={!selectedFile || uploadingFile}
              variant="destructive"
            >
              {uploadingFile ? 'מעלה...' : 'שחזר מבסיס נתונים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              אישור שחזור בסיס נתונים
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold mb-2">אזהרה קריטית!</p>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• פעולה זו תמחק את כל הנתונים הקיימים בבסיס הנתונים</li>
                  <li>• הנתונים יוחלפו בנתונים מהגיבוי: <strong>{selectedBackup?.filename}</strong></li>
                  <li>• פעולה זו אינה הפיכה</li>
                  <li>• כל המשתמשים המחוברים ייפגעו</li>
                </ul>
              </div>
              
              {!canConfirmRestore && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-800 font-semibold">המתן לאישור</span>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    עליך להמתין {restoreCountdown} שניות לפני שתוכל לאשר את השחזור
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && restoreBackup(selectedBackup.filename)}
              disabled={!canConfirmRestore}
              className="bg-red-600 hover:bg-red-700"
            >
              {canConfirmRestore ? 'אשר שחזור' : `המתן (${restoreCountdown})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת גיבוי</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הגיבוי "{selectedBackup?.filename}"?
              פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && deleteBackup(selectedBackup.filename)}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackupRestoreTab;
