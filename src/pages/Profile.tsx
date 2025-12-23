import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, LogOut, Monitor, User } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { storageService } from "@/lib/storage";

const Profile = () => {
  const { user } = useAuth();
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

  const defaultAvatarUrl = "/storage/uploads/avatars/default-avatar.png";

  const getNormalizedUrl = (raw: string) => storageService.getFileUrl(raw || "");
  const [googleIdentity, setGoogleIdentity] = useState(null);

  // Add state for password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.full_name || "");
      setTitle(user.title || "");
      const raw = user.avatar_url || defaultAvatarUrl;
      setAvatarUrl(getNormalizedUrl(raw));

      // Check if user has Google connected
      checkGoogleConnection();
    }
  }, [user]);

  const checkGoogleConnection = async () => {
    try {
      // Simplified check for Google connection as direct Supabase auth identity check may not be available
      setIsGoogleConnected(false);
      setGoogleIdentity(null);
      console.log("Google connection check not implemented in this context");
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      // Placeholder for Google OAuth connection
      toast({
        title: "חיבור לגוגל אינו זמין כרגע",
        description: "פונקציונליות זו אינה זמינה בסביבה זו",
        variant: "destructive"
      });
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
      setIsGoogleConnected(false);
      setGoogleIdentity(null);
      toast({
        title: "חשבון גוגל נותק בהצלחה"
      });
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      toast({
        title: "שגיאה בניתוק חשבון גוגל",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Add function to handle password change
  const handleChangePassword = async () => {
    try {
      setPasswordChangeLoading(true);
      setPasswordChangeError("");

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setPasswordChangeError("כל השדות נדרשים");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setPasswordChangeError("הסיסמאות החדשות אינן תואמות");
        return;
      }

      if (newPassword.length < 8) {
        setPasswordChangeError("הסיסמה החדשה חייבת להיות באורך של לפחות 8 תווים");
        return;
      }

      // Make API call to change password
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשינוי הסיסמה');
      }

      toast({
        title: "סיסמה שונתה בהצלחה"
      });

      // Clear form fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordChangeError(error.message || 'שגיאה בשינוי הסיסמה');
      toast({
        title: "שגיאה בשינוי הסיסמה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPasswordChangeLoading(false);
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

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to server
      const uploadResponse = await fetch('/api/storage/upload/avatars', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      const newAvatarUrl = uploadResult.data.path;

      // Update the avatar URL state
      setAvatarUrl(getNormalizedUrl(newAvatarUrl));

      // Immediately update the profile with the new avatar URL
      const profileResponse = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: name,
          title: title,
          avatar_url: newAvatarUrl
        }),
        credentials: 'include'
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Refresh user data to update the context
      const refreshResponse = await fetch('/api/auth/refresh-user-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (refreshResponse.ok) {
        const refreshedUserData = await refreshResponse.json();
        console.log('Refreshed user data:', refreshedUserData);
        // Update local storage with the new user data
        localStorage.setItem('user', JSON.stringify(refreshedUserData));
        // Trigger a custom event to notify AuthContext to refresh
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: refreshedUserData }));
      }

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

      console.log('Attempting to update profile with data:', { name, title, avatarUrl });
      // Make API call to update profile
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: name,
          title: title,
          avatar_url: avatarUrl
        }),
        credentials: 'include'
      });

      console.log('Profile update response status:', response.status);
      const data = await response.json();
      console.log('Profile update response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בעדכון הפרופיל');
      }

      // Fetch the latest user data to update the context
      const refreshResponse = await fetch('/api/auth/refresh-user-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (refreshResponse.ok) {
        const refreshedUserData = await refreshResponse.json();
        console.log('Refreshed user data:', refreshedUserData);
        // Update local storage with the new user data to ensure consistency with AuthContext
        localStorage.setItem('user', JSON.stringify(refreshedUserData));
        // Trigger a custom event to notify AuthContext to refresh
        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: refreshedUserData }));
      } else {
        console.error('Failed to refresh user data:', refreshResponse.status);
      }

      toast({
        title: "פרופיל עודכן בהצלחה"
      });
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
    <div className="container mx-auto py-12 px-6 max-w-5xl animate-in fade-in duration-1000" dir="rtl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">פרופיל משתמש</h1>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          <span className="font-bold">חזור</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-8 flex flex-col items-center bg-white/60 backdrop-blur-xl border-none premium-shadow rounded-[2.5rem]">
            <div
              className="relative group cursor-pointer"
              onClick={handleAvatarClick}
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl relative z-10">
                <AvatarImage src={avatarUrl} alt={name || "User Avatar"} className="object-cover" />
                <AvatarFallback className="bg-slate-100 text-slate-400 text-3xl font-black">{name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 scale-95 group-hover:scale-100">
                <Edit className="text-white w-8 h-8" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={uploadAvatar}
            />

            <div className="mt-6 text-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{name || "שם משתמש"}</h2>
              <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">{title || "תפקיד לא מוגדר"}</p>
            </div>

            {uploading && (
              <div className="mt-4 px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-full animate-pulse">
                מעלה תמונה...
              </div>
            )}
          </div>

          {/* Google Account Connection */}
          <div className="glass-card p-8 bg-white/60 backdrop-blur-xl border-none premium-shadow rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Monitor className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">חשבון גוגל</h2>
            </div>

            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              חיבור חשבון גוגל מאפשר גישה לקבצים משותפים ולוחות שנה של המערכת
            </p>

            {isGoogleConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-black uppercase tracking-wider">מחובר בהצלחה</span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 font-bold"
                  onClick={handleDisconnectGoogle}
                >
                  נתק חשבון גוגל
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                className="w-full h-12 rounded-xl bg-slate-900 text-white font-black shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleConnectGoogle}
              >
                חבר חשבון גוגל
              </Button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass-card p-10 bg-white/60 backdrop-blur-xl border-none premium-shadow rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                <User className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">פרטי מזהה</h2>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">שם מלא</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="title" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">תפקיד במערכת</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">כתובת דוא"ל</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="h-12 bg-slate-50/50 border-slate-100 rounded-xl font-medium text-slate-400"
                />
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="h-14 px-10 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>

          {/* Password Change Card */}
          <div className="glass-card p-10 bg-white/60 backdrop-blur-xl border-none premium-shadow rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                <LogOut className="h-5 w-5 rotate-180" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">שינוי סיסמה</h2>
            </div>

            {passwordChangeError && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold animate-in shake-in-1">
                {passwordChangeError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <Label htmlFor="currentPassword" title="סיסמה נוכחית" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">סיסמה נוכחית</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="newPassword" title="סיסמה חדשה" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">סיסמה חדשה</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmNewPassword" title="אישור סיסמה חדשה" className="text-xs font-black text-slate-400 uppercase tracking-widest mr-1">אישור סיסמה חדשה</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="h-12 bg-white/50 border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={passwordChangeLoading}
                variant="ghost"
                className="h-14 px-10 border border-slate-200 text-slate-800 font-black rounded-2xl hover:bg-slate-50 transition-all"
              >
                {passwordChangeLoading ? "משנה סיסמה..." : "שנה סיסמה"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
