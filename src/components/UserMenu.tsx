
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const UserMenu = () => {
  const { user, logout } = useAuth();
  
  const defaultAvatarUrl = "/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png";

  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">התחברות</Link>
      </Button>
    );
  }

  // Prepare display name with title if available
  const displayName = user.full_name || user.email || "אזור אישי";
  const displayTitle = user.title ? ` - ${user.title}` : '';
  const displayText = `${displayName}${displayTitle}`;

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild className="flex items-center gap-2">
        <Link to="/profile">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage 
              src={user.avatar_url || defaultAvatarUrl} 
              alt={displayName} 
            />
            <AvatarFallback>
              {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[200px] truncate">{displayText}</span>
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => logout()} className="flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        התנתק
      </Button>
    </div>
  );
};

export default UserMenu;
