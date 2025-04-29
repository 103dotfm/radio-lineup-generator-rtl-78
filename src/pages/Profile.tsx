
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, LogOut } from "lucide-react";
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
  const [isHovering, setIsHovering] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const defaultAvatarUrl = "/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png";

  useEffect(() => {
    if (user) {
      setName(user.full_name || "");
      setTitle(user.title || "");
      setAvatarUrl(user.avatar_url || defaultAvatarUrl);
      
      // Check if user has Google connected
      checkGoogleConnection();
    }
  }, [user]);

  const checkGoogleConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Error checking identity providers:", error);
        return;
      }
      
      // Check if the user has identities and if Google is among them
      const identities = data.user?.identities || [];
      const hasGoogleIdentity = identities.some(identity => 
        identity.provider === 'google'
      );
      
      setIsGoogleConnected(hasGoogleIdentity);
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

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
  
  const handleDisconnectGoogle = async () => {
    try {
      // We need to unlink the Google identity
      const { error } = await supabase.auth.unlinkIdentity({
        provider: 'google',
      });
      
      if (error) throw error;
      
      setIsGoogleConnected(false);
      toast({
        title: "חשבון גוגל נותק בהצלחה"
      });
      
      // Refresh profile to update user data
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      toast({
        title: "שגיאה בניתוק חשבון גוגל",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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
          <div 
            className="relative cursor-pointer" 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleAvatarClick}
          >
            <Avatar className="h-24 w-24">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name || "Profile"} />
              ) : (
                <AvatarImage src={defaultAvatarUrl} alt="Default Avatar" />
              )}
              <AvatarFallback>{name ? name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            
            {isHovering && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <Edit className="h-8 w-8 text-white" />
              </div>
            )}
            
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
            />
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
            {isGoogleConnected ? (
              <Button
                variant="outline"
                onClick={handleDisconnectGoogle}
                className="w-full flex items-center gap-2 text-red-500 border-red-300 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                נתק חשבון Google
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleConnectGoogle}
                className="w-full flex items-center gap-2"
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                חבר חשבון Google
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
