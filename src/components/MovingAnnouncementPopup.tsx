
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Building2 } from 'lucide-react';

const MovingAnnouncementPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup after a short delay when component mounts
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRedirect = () => {
    window.open('https://l.103.fm:8080', '_blank');
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-2xl" dir="rtl">
        <DialogHeader className="relative">
          <button
            onClick={handleClose}
            className="absolute left-0 top-0 p-2 rounded-full hover:bg-blue-200 transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </DialogHeader>
        
        <div className="flex items-start gap-4 p-4">
          {/* Animated Building Icon */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Building2 
                className="h-16 w-16 text-blue-600 animate-bounce" 
                style={{ animationDuration: '2s' }}
              />
              <div className="absolute -top-2 -right-2 h-4 w-4 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-4">
            <h1 className="text-2xl font-bold text-blue-800 text-center">
              יאאא, עברנו דירה!
            </h1>
            
            <div className="space-y-3 text-gray-700">
              <p>
                מערכת הליינאפים עברה לכתובת חדשה:{' '}
                <a 
                  href="https://l.103.fm:8080" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  https://l.103.fm:8080
                </a>
                .
              </p>
              
              <p>
                אין לכם גישה? הסיסמה לא עובדת? אף אחד לא מושלם. כתבו ליניב והוא יתמודד.
              </p>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleRedirect}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                דחף אותי לשם! 🏠
              </Button>
              
              <Button 
                onClick={handleClose}
                variant="outline"
                className="px-4 py-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                אחר כך
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovingAnnouncementPopup;
