// src/components/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn, Shield, User, AlertCircle } from 'lucide-react';
// IMPORTANT: adjust the relative path below if your googlesheet service file is located elsewhere.
// From src/components/Login.tsx -> common locations:
//  - src/services/googlesheet.ts  => ../services/googlesheet
//  - src/lib/googlesheet.ts       => ../lib/googlesheet
// If you use path aliases (@"..."), ensure tsconfig paths are configured.
import { googleSheetsAPI } from '../services/googleSheets';
import markazLogo from '@/assets/markaz-logo.png';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsSubmitting(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call the Google Sheets API for login using the configured service
      console.log('Calling Google Sheets API for login');
      const response = await googleSheetsAPI.loginSupplier({ email, password });
      console.log('Login response:', response);

      // response shape: { success: boolean, data: { success: boolean, user: { ... } } }
      if (response.success && response.data?.success && response.data?.user) {
        // Use the user data from the API response
        const userRole = response.data.user.role || 'supplier';
        loginWithUser({
          email: response.data.user.email,
          role: userRole,
          supplierId: response.data.user.supplierId,
          supplierName: response.data.user.supplierName
        });
        // Navigate to appropriate dashboard
        navigate(userRole === 'admin' ? '/admin' : '/supplier', { replace: true });
      } else {
        // Login failed according to the Sheets API
        const errorMessage = response.data?.message || response.error || 'Invalid credentials. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'supplier') => {
    if (role === 'admin') {
      setEmail('admin@markaz.com');
      setPassword('admin123');
    } else {
      setEmail('supplier@demo.com');
      setPassword('supplier123');
    }
    setError(''); // Clear any previous errors
  };

  const testConnection = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const response = await googleSheetsAPI.healthCheck();
      if (response.success) {
        setError('');
        alert('Connection successful! System is working properly.');
      } else {
        setError('Connection failed: ' + response.error);
      }
    } catch (err) {
      console.error('Health check error', err);
      setError('Connection test failed. Please check your configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={markazLogo} 
              alt="Markaz Technologies"
              className="h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Markaz
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Supplier Dispute Management Portal
          </p>
        </div>

        <Card className="bg-card shadow-card border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Enter your registered credentials to access the portal
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border focus:ring-primary"
                  disabled={isFormDisabled}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-border focus:ring-primary pr-10"
                    disabled={isFormDisabled}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isFormDisabled}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-slide-up">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary"
                disabled={isFormDisabled}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">Demo Accounts</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testConnection}
                  className="text-xs px-2 py-1 h-auto"
                  disabled={isFormDisabled}
                  title="Test connection to Google Sheets"
                >
                  Test Connection
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemoCredentials('admin')}
                  className="text-xs flex items-center gap-1"
                  disabled={isFormDisabled}
                >
                  <Shield className="h-3 w-3" />
                  Admin Demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemoCredentials('supplier')}
                  className="text-xs flex items-center gap-1"
                  disabled={isFormDisabled}
                >
                  <User className="h-3 w-3" />
                  Supplier Demo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Click demo buttons to auto-fill credentials
              </p>
            </div>

            {/* Help Section */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Need Help?
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use your registered email and password</li>
                <li>• Contact admin if you forgot your credentials</li>
                <li>• Ensure stable internet connection</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          © 2024 Markaz Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
