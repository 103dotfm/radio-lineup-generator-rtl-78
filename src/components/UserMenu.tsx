
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";

const UserMenu = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">התחברות</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          אזור אישי
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
