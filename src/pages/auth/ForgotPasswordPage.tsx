import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Zap, ArrowLeft } from 'lucide-react';

interface ForgotPasswordPageProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onToast }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    // Reset password link redirects back to our application url
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#settings`, // Redirect to settings to allow changing password
    });

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      onToast(resetError.message, 'error');
    } else {
      setSuccess(true);
      onToast('Password recovery email sent! Check your inbox.', 'success');
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
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Recover Password</h2>
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

        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <p style={{ color: 'var(--color-success)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Recovery email sent!
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Please check your inbox at <strong>{email}</strong> for instructions on resetting your password.
            </p>
            <a 
              href="#login" 
              className="btn btn-outline" 
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={16} style={{ marginRight: '8px' }} />
              <span>Back to Sign In</span>
            </a>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <Button 
              type="submit" 
              style={{ width: '100%', marginTop: 'var(--space-xs)' }} 
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>
        )}

        {!success && (
          <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center', fontSize: '0.875rem' }}>
            <a 
              href="#login" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Log In</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
