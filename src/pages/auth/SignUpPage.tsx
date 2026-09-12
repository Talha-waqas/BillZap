import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { referralService } from '../../services/referralService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Zap, Gift } from 'lucide-react';

interface SignUpPageProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onToast }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract ?ref= from hash or search query
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let ref = searchParams.get('ref');
      if (!ref && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        ref = hashParams.get('ref');
      }
      if (ref) {
        setReferralCode(ref.trim().toUpperCase());
      }
    } catch (e) {
      console.error('Error parsing referral code:', e);
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    const cleanRef = referralCode.trim().toUpperCase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          referral_code: cleanRef || undefined,
        },
      },
    });

    if (authError) {
      setIsLoading(false);
      setError(authError.message);
      onToast(authError.message, 'error');
      return;
    }

    // If signup succeeded and a referral code was provided, link in referral service
    if (authData?.user && cleanRef) {
      try {
        await referralService.linkReferredUser(authData.user.id, cleanRef);
      } catch (err) {
        console.error('Failed to link referral:', err);
      }
    }

    setIsLoading(false);
    onToast('Account created successfully! Check your email if validation is required, or proceed to log in.', 'success');
    window.location.hash = '#onboarding';
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', marginBottom: 'var(--space-2xs)' }}>
            <Zap size={28} fill="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem' }}>BillZap</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Create your free account</h2>
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

        <form onSubmit={handleSignUp}>
          <Input
            label="Full Name"
            type="text"
            placeholder="Muhammad Ali"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
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
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <div style={{ marginTop: 'var(--space-2xs)' }}>
            <Input
              label="Referral Code (Optional)"
              type="text"
              placeholder="e.g. BZ9X4Y"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              disabled={isLoading}
            />
            {referralCode && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '-8px', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Gift size={12} /> Referral code applied!
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            style={{ width: '100%', marginTop: 'var(--space-xs)' }} 
            isLoading={isLoading}
          >
            Create Account
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <a 
            href="#login" 
            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
};
