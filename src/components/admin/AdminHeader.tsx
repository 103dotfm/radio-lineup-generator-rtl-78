
import React from 'react';
import { H1 } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { BarChart3, Calendar, Settings, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const isStaffPage = queryParams.get('tab') === 'staff';
  
  const goToStaffPage = () => {
    queryParams.set('tab', 'staff');
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };
  
  const goToMainAdmin = () => {
    queryParams.delete('tab');
    navigate(`${location.pathname}?${queryParams.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <H1>הגדרות מערכת</H1>
        <p className="text-gray-500">נהל את הגדרות המערכת שלך</p>
      </div>
      
      <div className="flex gap-2">
        {isStaffPage ? (
          <Button variant="outline" onClick={goToMainAdmin}>
            <Settings className="mr-2 h-4 w-4" />
            חזרה להגדרות
          </Button>
        ) : (
          <Button variant="outline" onClick={goToStaffPage}>
            <Users className="mr-2 h-4 w-4" />
            ניהול צוות
          </Button>
        )}
        
        <Button variant="outline" onClick={() => navigate('/schedule')}>
          <Calendar className="mr-2 h-4 w-4" />
          לוח שידורים
        </Button>
        
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          לוח בקרה
        </Button>
      </div>
    </div>
  );
};

export default AdminHeader;
