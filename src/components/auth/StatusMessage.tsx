
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusType = 'processing' | 'success' | 'error';

interface StatusMessageProps {
  status: StatusType;
  errorDetails: string | null;
}

export const StatusMessage = ({ status, errorDetails }: StatusMessageProps) => {
  if (status === 'processing') {
    return (
      <div className="flex justify-center my-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Alert className="mb-6 bg-green-50 border-green-200">
        <Check className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-800">Success!</AlertTitle>
        <AlertDescription className="text-green-700">
          Google Authentication was successful. You will be redirected shortly.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Authentication Failed</AlertTitle>
        <AlertDescription>
          {errorDetails || 'An unknown error occurred during authentication.'}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
