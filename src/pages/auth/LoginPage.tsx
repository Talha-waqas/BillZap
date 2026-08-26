import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Zap } from 'lucide-react';

interface LoginPageProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
      onToast(authError.message, 'error');
    } else {
      onToast('Logged in successfully!', 'success');
      // On success, App.tsx listener will catch session change and redirect.
      window.location.hash = '#dashboard';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', marginBottom: 'var(--space-2xs)' }}>
            <Zap size={28} fill="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem' }}>BillZap</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Welcome back</h2>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: 'var(--space-md)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <Input
            label="Email Address"
            type="email"
            placeholder="name@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <div style={{ textAlign: 'right', marginBottom: 'var(--space-md)' }}>
            <a 
              href="#forgot-password" 
              style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}
            >
              Forgot password?
            </a>
          </div>

          <Button 
            type="submit" 
            style={{ width: '100%' }} 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <a 
            href="#signup" 
            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
};
