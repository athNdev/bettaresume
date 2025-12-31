'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'Authentication was cancelled or failed');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        const result = await handleOAuthCallback(code);
        
        if (result.success) {
          setStatus('success');
          // Redirect to dashboard after a brief success message
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setStatus('error');
          setError(result.error || 'Failed to complete sign in');
        }
      } catch (err) {
        setStatus('error');
        setError('An unexpected error occurred');
        console.error('OAuth callback error:', err);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'loading' && 'Signing you in...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Sign in failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">
                Please wait while we complete your sign in...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-muted-foreground text-sm">
                Redirecting to dashboard...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="h-8 w-8 text-destructive" />
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:underline text-sm"
              >
                Return to login
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
