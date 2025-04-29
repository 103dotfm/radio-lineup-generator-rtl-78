
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

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild className="flex items-center gap-2">
        <Link to="/profile">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage 
              src={user.avatar_url || defaultAvatarUrl} 
              alt={user.full_name || ""} 
            />
            <AvatarFallback>{user.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <span>{user.full_name || "אזור אישי"}</span>
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
