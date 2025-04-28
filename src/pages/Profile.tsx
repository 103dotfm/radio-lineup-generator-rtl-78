
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`
        }
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: "שגיאה בהתחברות לגוגל",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ title })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "הפרופיל עודכן בהצלחה"
      });
    } catch (error) {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">אזור אישי</h1>
        
        <div className="space-y-4">
          <div>
            <Label>כתובת אימייל</Label>
            <Input value={user.email} disabled />
          </div>

          <div>
            <Label>תפקיד</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="הזן את תפקידך"
            />
          </div>

          <Button 
            onClick={handleUpdateProfile}
            className="w-full"
            disabled={loading}
          >
            עדכן פרופיל
          </Button>

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={handleConnectGoogle}
              className="w-full"
            >
              חבר חשבון Google
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
