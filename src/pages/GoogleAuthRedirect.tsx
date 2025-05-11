
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusMessage } from '@/components/auth/StatusMessage';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

const GoogleAuthRedirect = () => {
  const navigate = useNavigate();
  const { status, errorDetails } = useGoogleAuth();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Google Authentication</h2>
            <p className="text-gray-500">
              {status === 'processing' && 'Processing your authentication...'}
              {status === 'success' && 'Authentication successful! Redirecting to dashboard...'}
              {status === 'error' && 'Authentication failed'}
            </p>
          </div>
          
          <StatusMessage status={status} errorDetails={errorDetails} />
          
          <div className="flex flex-col space-y-3 mt-6">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthRedirect;
