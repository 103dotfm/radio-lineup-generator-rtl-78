import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRDSSettings, updateRDSSettings, getCurrentRDSData, sendCurrentRDSData, invalidateRDSCache, sendRDSDataViaTelnet, getRDSTransmissionLogs, getCronStatus, restartCron, triggerManualTransmission } from "@/lib/api/rds";
import { RDSSettings as RDSSettingsType, RDSData } from "@/types/schedule";
import { Save, Radio, Send, Eye, RefreshCw, Wifi, Clock } from "lucide-react";

const RDSSettings = () => {
  const [settings, setSettings] = useState<RDSSettingsType | null>(null);
  const [currentRDSData, setCurrentRDSData] = useState<(RDSData & { show_name: string; host_name: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingRDS, setSendingRDS] = useState(false);
  const [sendingTelnet, setSendingTelnet] = useState(false);
  const [transmissionLogs, setTransmissionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [loadingCronStatus, setLoadingCronStatus] = useState(false);
  const [restartingCron, setRestartingCron] = useState(false);
  const { toast } = useToast();

  const PTY_LABELS: { [key: number]: string } = {
    0: "NONE",
    1: "NEWS",
    4: "SPORTS",
    17: "FINANCE",
    21: "PHONE-IN",
    26: "NATIONAL MUSIC",
  };

  const MS_LABELS: { [key: number]: string } = {
    0: "SPEECH ONLY",
    1: "MUSIC PROGRAMMING",
  };

  useEffect(() => {
    loadSettings();
    loadCurrentRDSData();
    loadCronStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getRDSSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading RDS settings:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת הגדרות RDS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentRDSData = async () => {
    try {
      setLoadingPreview(true);
      const data = await getCurrentRDSData();
      setCurrentRDSData(data);
    } catch (error) {
      console.error('Error loading current RDS data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני RDS נוכחיים",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await updateRDSSettings(settings);
      toast({
        title: "הצלחה",
        description: "הגדרות RDS נשמרו בהצלחה",
      });
      // Reload current RDS data after saving settings
      await loadCurrentRDSData();
    } catch (error) {
      console.error('Error saving RDS settings:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשמירת הגדרות RDS",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendRDS = async () => {
    try {
      setSendingRDS(true);
      
      // First, invalidate the cache to get fresh data
      await invalidateRDSCache();
      
      // Then send the current RDS data
      const result = await sendCurrentRDSData();
      
      // Reload the current RDS data to show the updated information
      await loadCurrentRDSData();
      
      toast({
        title: "הצלחה",
        description: "נתוני RDS עודכנו ונשלחו בהצלחה",
      });
    } catch (error) {
      console.error('Error updating and sending RDS data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון ושליחת נתוני RDS",
        variant: "destructive",
      });
    } finally {
      setSendingRDS(false);
    }
  };

  const handleToggleSendRDS = (checked: boolean) => {
    if (settings) {
      setSettings({ ...settings, send_rds_on_program_change: checked });
    }
  };

  const handleRT2Change = (value: string) => {
    if (settings) {
      setSettings({ ...settings, rds_rt2: value.substring(0, 64) });
    }
  };

  const handleRT3Change = (value: string) => {
    if (settings) {
      setSettings({ ...settings, rds_rt3: value.substring(0, 64) });
    }
  };

  const handleSendViaTelnet = async () => {
    try {
      setSendingTelnet(true);
      
      const result = await sendRDSDataViaTelnet();
      
      if (result.success) {
        toast({
          title: "הצלחה",
          description: "נתוני RDS נשלחו בהצלחה דרך Telnet",
        });
      } else if (result.skipped) {
        toast({
          title: "דילוג",
          description: "שליחת Telnet דולגה: " + result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "שגיאה",
          description: "שגיאה בשליחת נתוני RDS דרך Telnet",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending RDS data via telnet:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת נתוני RDS דרך Telnet",
        variant: "destructive",
      });
    } finally {
      setSendingTelnet(false);
    }
  };

  const loadTransmissionLogs = async () => {
    try {
      setLoadingLogs(true);
      const result = await getRDSTransmissionLogs(50);
      if (result.success) {
        setTransmissionLogs(result.logs);
      }
    } catch (error) {
      console.error('Error loading transmission logs:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת יומני שידור",
        variant: "destructive",
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadCronStatus = async () => {
    try {
      setLoadingCronStatus(true);
      const response = await getCronStatus();
      if (response.success) {
        setCronStatus(response.status);
      }
    } catch (error) {
      console.error('Error loading cron status:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת סטטוס Cron",
        variant: "destructive",
      });
    } finally {
      setLoadingCronStatus(false);
    }
  };

  const handleRestartCron = async () => {
    try {
      setRestartingCron(true);
      const response = await restartCron();
      if (response.success) {
        toast({
          title: "הצלחה",
          description: "Cron Job אופס מחדש בהצלחה",
        });
        // Reload cron status after restart
        setTimeout(() => {
          loadCronStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Error restarting cron:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה באופס מחדש של Cron Job",
        variant: "destructive",
      });
    } finally {
      setRestartingCron(false);
    }
  };

  const handleTriggerManualTransmission = async () => {
    try {
      setSendingTelnet(true);
      const response = await triggerManualTransmission();
      if (response.success) {
        toast({
          title: "הצלחה",
          description: "שידור ידני הופעל בהצלחה",
        });
        // Reload transmission logs
        loadTransmissionLogs();
      }
    } catch (error) {
      console.error('Error triggering manual transmission:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בהפעלת שידור ידני",
        variant: "destructive",
      });
    } finally {
      setSendingTelnet(false);
    }
  };

  const toggleLogs = () => {
    if (!showLogs) {
      loadTransmissionLogs();
    }
    setShowLogs(!showLogs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>טוען הגדרות RDS...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8">
        <p>לא ניתן לטעון הגדרות RDS</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">הגדרות RDS</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות כלליות</CardTitle>
          <CardDescription>
            הגדרות RDS גלובליות למערכת הרדיו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send-rds">שלח נתוני RDS בעת החלפת תוכנית</Label>
              <p className="text-sm text-muted-foreground">
                שלח אוטומטית נתוני RDS כאשר תוכנית מתחלפת
                {settings.send_rds_on_program_change && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                    פעיל
                  </span>
                )}
              </p>
            </div>
            <Switch
              id="send-rds"
              checked={settings.send_rds_on_program_change}
              onCheckedChange={handleToggleSendRDS}
            />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-rt1">RT1 ברירת מחדל - טקסט רדיו</Label>
              <Input
                id="default-rt1"
                value={settings.default_rt1 || ''}
                onChange={(e) => {
                  if (settings) {
                    setSettings({ ...settings, default_rt1: e.target.value.substring(0, 64) });
                  }
                }}
                placeholder="טקסט ברירת מחדל כאשר אין תוכנית מתוזמנת (עד 64 תווים)"
                maxLength={64}
              />
              <p className="text-sm text-muted-foreground">
                {(settings.default_rt1 || '').length}/64 תווים
              </p>
              <p className="text-xs text-muted-foreground">
                טקסט זה יוצג כאשר אין תוכנית מתוזמנת (למשל בלילה)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt2">RT2 - טקסט רדיו נוסף</Label>
              <Input
                id="rt2"
                value={settings.rds_rt2}
                onChange={(e) => handleRT2Change(e.target.value)}
                placeholder="טקסט נוסף ל-RDS (עד 64 תווים)"
                maxLength={64}
              />
              <p className="text-sm text-muted-foreground">
                {settings.rds_rt2.length}/64 תווים
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt3">RT3 - טקסט רדיו נוסף</Label>
              <Input
                id="rt3"
                value={settings.rds_rt3}
                onChange={(e) => handleRT3Change(e.target.value)}
                placeholder="טקסט נוסף ל-RDS (עד 64 תווים)"
                maxLength={64}
              />
              <p className="text-sm text-muted-foreground">
                {settings.rds_rt3.length}/64 תווים
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'שומר...' : 'שמור הגדרות'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות דריסה (Override)</CardTitle>
          <CardDescription>
            דרוס את נתוני RDS הנוכחיים עם ערכים ידניים. השינויים יחולו בלחיצה על "עדכן עכשיו" וימשיכו עד תחילת תוכנית חדשה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="override-enabled">הפעל דריסת RDS</Label>
              <p className="text-sm text-muted-foreground">
                דרוס את נתוני RDS הנוכחיים עם הערכים למטה
              </p>
            </div>
            <Switch
              id="override-enabled"
              checked={settings.override_enabled || false}
              onCheckedChange={(checked) => {
                if (settings) {
                  setSettings({ ...settings, override_enabled: checked });
                }
              }}
            />
          </div>

          {settings.override_enabled && (
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="override-pty">PTY - סוג תוכנית</Label>
                  <select
                    id="override-pty"
                    value={settings.override_pty || ''}
                    onChange={(e) => {
                      if (settings) {
                        setSettings({ 
                          ...settings, 
                          override_pty: e.target.value ? parseInt(e.target.value) : undefined 
                        });
                      }
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">בחר סוג תוכנית</option>
                    <option value="0">NONE</option>
                    <option value="1">NEWS</option>
                    <option value="4">SPORTS</option>
                    <option value="17">FINANCE</option>
                    <option value="21">PHONE-IN</option>
                    <option value="26">NATIONAL MUSIC</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="override-ms">MS - מוזיקה/דיבור</Label>
                  <select
                    id="override-ms"
                    value={settings.override_ms || ''}
                    onChange={(e) => {
                      if (settings) {
                        setSettings({ 
                          ...settings, 
                          override_ms: e.target.value ? parseInt(e.target.value) : undefined 
                        });
                      }
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">בחר סוג תוכן</option>
                    <option value="0">SPEECH ONLY</option>
                    <option value="1">MUSIC PROGRAMMING</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="override-rt1">RT1 - טקסט רדיו</Label>
                <Input
                  id="override-rt1"
                  value={settings.override_rt1 || ''}
                  onChange={(e) => {
                    if (settings) {
                      setSettings({ 
                        ...settings, 
                        override_rt1: e.target.value.substring(0, 64) 
                      });
                    }
                  }}
                  placeholder="טקסט רדיו ידני (עד 64 תווים)"
                  maxLength={64}
                />
                <p className="text-sm text-muted-foreground">
                  {(settings.override_rt1 || '').length}/64 תווים
                </p>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'שומר...' : 'שמור הגדרות דריסה'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            תצוגה מקדימה RDS נוכחי
            {currentRDSData?.override_enabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                דריסה פעילה
              </span>
            )}
          </CardTitle>
          <CardDescription>
            נתוני RDS הנוכחיים שיישלחו למשדר
            {currentRDSData?.override_enabled && ' (עם דריסה)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPreview ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="mr-2">טוען נתוני RDS...</span>
            </div>
          ) : currentRDSData ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">PTY:</span> {PTY_LABELS[currentRDSData.pty] || currentRDSData.pty}
                </div>
                <div>
                  <span className="font-semibold">MS:</span> {MS_LABELS[currentRDSData.ms] || currentRDSData.ms}
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-sm">Radio Text:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono" dir="ltr">
                    {currentRDSData.radio_text || '(ריק)'}
                  </div>
                </div>
                
                {currentRDSData.rt2 && (
                  <div>
                    <span className="font-semibold text-sm">RT2:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono" dir="ltr">
                      {currentRDSData.rt2}
                    </div>
                  </div>
                )}
                
                {currentRDSData.rt3 && (
                  <div>
                    <span className="font-semibold text-sm">RT3:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono" dir="ltr">
                      {currentRDSData.rt3}
                    </div>
                  </div>
                )}
              </div>

              {currentRDSData.show_name && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold">תוכנית נוכחית:</span> {currentRDSData.show_name}
                  {currentRDSData.host_name && ` עם ${currentRDSData.host_name}`}
                </div>
              )}
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSendRDS}
                  disabled={sendingRDS}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingRDS ? 'שולח...' : 'עדכן עכשיו'}
                </Button>
                <Button
                  onClick={handleSendViaTelnet}
                  disabled={sendingTelnet}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  {sendingTelnet ? 'שולח Telnet...' : 'שלח Telnet'}
                </Button>
                <Button
                  variant="outline"
                  onClick={loadCurrentRDSData}
                  disabled={loadingPreview}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center p-4 text-gray-500">
              לא ניתן לטעון נתוני RDS נוכחיים
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מידע על RDS</CardTitle>
          <CardDescription>
            Radio Data System - מערכת להעברת מידע דיגיטלי דרך שידורי הרדיו
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">שדות RDS:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>PTY</strong> - סוג התוכנית (NEWS, SPORTS, PHONE-IN, וכו')</li>
                <li>• <strong>MS</strong> - מוזיקה/דיבור (SPEECH ONLY או MUSIC PROGRAMMING)</li>
                <li>• <strong>Radio Text</strong> - טקסט התוכנית (עד 64 תווים)</li>
                <li>• <strong>RT2/RT3</strong> - טקסטים נוספים (עד 64 תווים כל אחד)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">הערות:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• כל הטקסטים חייבים להיות באנגלית</li>
                <li>• מערכת התרגום האוטומטי תתרגם את שמות התוכניות והמגישים</li>
                <li>• חיבור למשדר מתבצע דרך Telnet לשרת 82.81.38.216:10002</li>
                <li>• שליחת נתונים מתבצעת אוטומטית כל 30 דקות (XX:00 ו-XX:30)</li>
                <li>• ניתן לשלוח נתונים ידנית באמצעות כפתור "שלח Telnet"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            סטטוס Cron Job
          </CardTitle>
          <CardDescription>
            מצב הפעלה של Cron Job לשליחת נתוני RDS אוטומטית
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingCronStatus ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="mr-2">טוען סטטוס Cron...</span>
              </div>
            ) : cronStatus ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">סטטוס:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2 ${
                      cronStatus.isRunning 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cronStatus.isRunning ? 'פועל' : 'לא פועל'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">זמן הפעלה:</span>
                    <span className="text-muted-foreground">
                      {cronStatus.uptime ? `${Math.floor(cronStatus.uptime / 3600)}h ${Math.floor((cronStatus.uptime % 3600) / 60)}m` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">ריצות סה"כ:</span>
                    <span className="text-muted-foreground">{cronStatus.totalRuns}</span>
                  </div>
                  <div>
                    <span className="font-semibold">ריצה אחרונה:</span>
                    <span className="text-muted-foreground">
                      {cronStatus.lastRun ? new Date(cronStatus.lastRun).toLocaleString('he-IL') : 'N/A'}
                    </span>
                  </div>
                </div>

                {cronStatus.lastError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-semibold text-red-800 mb-1">שגיאה אחרונה:</div>
                    <div className="text-sm text-red-700">{cronStatus.lastError}</div>
                  </div>
                )}

                {cronStatus.nextRuns && cronStatus.nextRuns.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-semibold text-blue-800 mb-2">ריצות הבאות:</div>
                    <div className="space-y-1">
                      {cronStatus.nextRuns.slice(0, 3).map((run, index) => (
                        <div key={index} className="text-sm text-blue-700">
                          {run}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleRestartCron}
                    disabled={restartingCron}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${restartingCron ? 'animate-spin' : ''}`} />
                    {restartingCron ? 'מאפס מחדש...' : 'אפס Cron מחדש'}
                  </Button>
                  <Button
                    onClick={handleTriggerManualTransmission}
                    disabled={sendingTelnet}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingTelnet ? 'שולח...' : 'שידור ידני'}
                  </Button>
                  <Button
                    onClick={loadCronStatus}
                    disabled={loadingCronStatus}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingCronStatus ? 'animate-spin' : ''}`} />
                    רענן סטטוס
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-gray-500">
                לא ניתן לטעון סטטוס Cron
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            יומני שידור Telnet
          </CardTitle>
          <CardDescription>
            יומני שליחת נתוני RDS דרך חיבור Telnet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={toggleLogs}
              disabled={loadingLogs}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {showLogs ? 'הסתר יומנים' : 'הצג יומנים'}
            </Button>

            {showLogs && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadingLogs ? (
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    טוען יומנים...
                  </div>
                ) : transmissionLogs.length > 0 ? (
                  transmissionLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border ${
                        log.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {new Date(log.transmission_time).toLocaleString('he-IL')}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.success ? 'הצלחה' : 'שגיאה'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>שרת:</strong> {log.telnet_server}:{log.telnet_port}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>הודעה:</strong> {log.message}
                      </div>
                      {log.rds_data && (
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                          <strong>נתונים:</strong> PTY={log.rds_data.pty}, MS={log.rds_data.ms}, 
                          RT1="{log.rds_data.rt1}", RT2="{log.rds_data.rt2}", RT3="{log.rds_data.rt3}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    אין יומני שידור זמינים
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RDSSettings;
