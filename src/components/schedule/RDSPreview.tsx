import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRDSDataForSlot, sendRDSData } from "@/lib/api/rds";
import { RDSData } from "@/types/schedule";
import { Send, Radio, Eye } from "lucide-react";

interface RDSPreviewProps {
  slotId: string;
  showName: string;
  hostName?: string;
}

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

const RDSPreview: React.FC<RDSPreviewProps> = ({ slotId, showName, hostName }) => {
  const [rdsData, setRdsData] = useState<RDSData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const loadRDSData = async () => {
    try {
      setLoading(true);
      const data = await getRDSDataForSlot(slotId);
      setRdsData(data);
    } catch (error) {
      console.error('Error loading RDS data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני RDS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRDS = async () => {
    try {
      setSending(true);
      const result = await sendRDSData(slotId);
      toast({
        title: "הצלחה",
        description: result.message,
      });
    } catch (error) {
      console.error('Error sending RDS data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת נתוני RDS",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const togglePreview = () => {
    if (!showPreview && !rdsData) {
      loadRDSData();
    }
    setShowPreview(!showPreview);
  };

  if (!showPreview) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={togglePreview}
        className="flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        תצוגה מקדימה RDS
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          תצוגה מקדימה RDS
        </CardTitle>
        <CardDescription>
          נתוני RDS עבור: {showName} {hostName && `עם ${hostName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            <span className="mr-2">טוען נתוני RDS...</span>
          </div>
        ) : rdsData ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">PTY:</span> {PTY_LABELS[rdsData.pty] || rdsData.pty}
              </div>
              <div>
                <span className="font-semibold">MS:</span> {MS_LABELS[rdsData.ms] || rdsData.ms}
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="font-semibold text-sm">Radio Text:</span>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                  {rdsData.radio_text || '(ריק)'}
                </div>
              </div>
              
              {rdsData.rt2 && (
                <div>
                  <span className="font-semibold text-sm">RT2:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    {rdsData.rt2}
                  </div>
                </div>
              )}
              
              {rdsData.rt3 && (
                <div>
                  <span className="font-semibold text-sm">RT3:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    {rdsData.rt3}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSendRDS}
                disabled={sending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'שולח...' : 'שלח ל-RDS עכשיו'}
              </Button>
              <Button
                variant="outline"
                onClick={togglePreview}
              >
                סגור
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center p-4 text-gray-500">
            לא ניתן לטעון נתוני RDS
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RDSPreview;
