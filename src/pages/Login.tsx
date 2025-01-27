import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success('התחברת בהצלחה');
      navigate('/');
    } else {
      toast.error('שם משתמש או סיסמה שגויים');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="flex justify-center">
          <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103fm" className="h-20 mb-6 loginLogo" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-900">מערכת ליינאפים</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="שם משתמש"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            התחבר
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
