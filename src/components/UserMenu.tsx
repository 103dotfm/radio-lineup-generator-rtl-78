import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { storageService } from "@/lib/storage";


const UserMenu = () => {
  const { user, signOut } = useAuth();
  
  const defaultAvatarUrl = "/storage/uploads/avatars/default-avatar.png";

  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild className="w-full md:w-auto">
        <Link to="/login">התחברות</Link>
      </Button>
    );
  }

  // Prepare display name with title if available
  const displayName = user.full_name || user.email || "אזור אישי";
  const displayTitle = user.title ? ` - ${user.title}` : '';
  const displayText = `${displayName}${displayTitle}`;

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
      <Button variant="ghost" size="sm" asChild className="flex items-center gap-2 justify-start w-full md:w-auto">
        <Link to="/profile">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage 
              src={storageService.getFileUrl(user.avatar_url || defaultAvatarUrl)} 
              alt={displayName} 
            />
            <AvatarFallback>
              {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[200px] truncate hidden sm:inline">{displayText}</span>
          <span className="sm:hidden">פרופיל</span>
        </Link>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => signOut()} 
        className="flex items-center gap-2 justify-start w-full md:w-auto"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">התנתק</span>
        <span className="sm:hidden">התנתקות</span>
      </Button>
    </div>
  );
};

export default UserMenu;
