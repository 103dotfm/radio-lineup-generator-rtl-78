
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.full_name || "");
      setTitle(user.title || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

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

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setAvatarUrl(data.publicUrl);
      
      toast({
        title: "התמונה הועלתה בהצלחה"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "שגיאה בהעלאת התמונה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const updates = {
        id: user?.id, // Ensure ID is included for the update
        full_name: name,
        title,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: "הפרופיל עודכן בהצלחה"
      });
      
      // Refresh user profile data in context
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
      <Button 
        variant="ghost" 
        onClick={() => navigate('/')} 
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה ללוח הבקרה
      </Button>
      
      <Card className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">אזור אישי</h1>
        
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name || "Profile"} />
              ) : (
                <AvatarFallback>{name ? name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              )}
            </Avatar>
            <div className="absolute -bottom-2 -right-2">
              <label 
                htmlFor="avatar-upload" 
                className="bg-primary hover:bg-primary/90 text-white p-1 rounded-full cursor-pointer transition-colors"
              >
                <Upload className="h-4 w-4" />
                <input 
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>שם מלא</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="הזן את שמך המלא"
            />
          </div>
          
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
