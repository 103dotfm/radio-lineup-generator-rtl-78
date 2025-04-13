
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

const XmlFeedManager = () => {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshXml = async () => {
    try {
      setRefreshing(true);
      const xmlEndpoint = 'https://yyrmodgbnzqbmatlypuc.supabase.co/functions/v1/schedule-xml';

      // Call the XML endpoint to refresh the XML
      const response = await fetch(xmlEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession().then(res => res.data.session?.access_token)}`
        },
      });

      if (response.ok) {
        toast({
          title: "XML refreshed successfully",
          description: "The schedule XML feed has been refreshed."
        });
      } else {
        throw new Error(`Error refreshing XML: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error refreshing XML:', error);
      toast({
        title: "XML refresh failed",
        description: "There was an error refreshing the XML feed.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>XML Schedule Feed</CardTitle>
        <CardDescription>
          Manage the XML feed for the radio schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <p className="text-sm text-muted-foreground mb-2">
              The XML feed is automatically refreshed every 10 minutes. You can manually refresh it using the button below.
            </p>
            <div>
              <Button 
                onClick={handleRefreshXml} 
                disabled={refreshing}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh XML Feed Now'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              <a href="/xml-feed" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                View XML Feed Documentation
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default XmlFeedManager;
