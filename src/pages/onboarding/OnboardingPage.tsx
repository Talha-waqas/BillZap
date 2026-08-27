import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Zap, ArrowRight } from 'lucide-react';
import { Business } from '../../types';

interface OnboardingPageProps {
  onOnboardingComplete: (business: Business) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onOnboardingComplete,
  onToast,
}) => {
  // Form states
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('PKR');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleFinish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!businessName.trim()) {
      setValidationError('Business Name is required.');
      return;
    }

    setIsLoading(true);
    setValidationError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onToast('User session expired. Please log in again.', 'error');
        window.location.hash = '#login';
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          user_id: user.id,
          name: businessName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          currency,
          invoice_prefix: 'INV-',
          last_invoice_number: 0,
        })
        .select()
        .single();

      if (error) throw error;

      onToast('Business setup completed!', 'success');
      onOnboardingComplete(data as Business);
      window.location.hash = '#dashboard';
    } catch (err: any) {
      console.error('Error saving business profile:', err);
      onToast(err.message || 'Setup failed.', 'error');
      setValidationError(err.message || 'Setup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    setValidationError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onToast('User session expired. Please log in again.', 'error');
        window.location.hash = '#login';
        return;
      }

      // Create a default business profile using user's email prefix or "My Business"
      const defaultName = user.email ? user.email.split('@')[0] + ' Store' : 'My Business';

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          user_id: user.id,
          name: defaultName,
          phone: null,
          address: null,
          currency: 'PKR',
          invoice_prefix: 'INV-',
          last_invoice_number: 0,
        })
        .select()
        .single();

      if (error) throw error;

      onToast('Setup skipped. Welcome to BillZap!', 'success');
      onOnboardingComplete(data as Business);
      window.location.hash = '#dashboard';
    } catch (err: any) {
      console.error('Error skipping onboarding:', err);
      onToast(err.message || 'Skip failed.', 'error');
      setValidationError(err.message || 'Skip failed.');
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-md)' }}>
      <div className="auth-card" style={{ width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', marginBottom: 'var(--space-3xs)' }}>
            <Zap size={24} fill="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem' }}>BillZap Setup</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Complete your profile details to customize your invoices. You can always edit these details in settings.
          </p>
        </div>

        {validationError && (
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: 'var(--space-md)'
          }}>
            {validationError}
          </div>
        )}

        {/* Quick 1-Page Form */}
        <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Input
            label="Business Name *"
            type="text"
            placeholder="e.g. NØRTH Clothing"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Default Invoice Currency"
            options={[
              { value: 'PKR', label: 'PKR — Pakistani Rupee (Rs.)' },
              { value: 'USD', label: 'USD — US Dollar ($)' },
              { value: 'AED', label: 'AED — UAE Dirham' },
              { value: 'GBP', label: 'GBP — British Pound (£)' },
            ]}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />

          <Input
            label="Contact Phone Number (Optional)"
            type="text"
            placeholder="e.g. 0322 8964384"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Physical Address (Optional)"
            type="text"
            placeholder="e.g. Office 14, DHA Phase 5, Karachi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Form Actions Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: 'var(--space-md)', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: 'var(--space-md)' 
          }}>
            <button
              type="button"
              onClick={handleSkip}
              disabled={isLoading || isSkipping}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textDecoration: 'underline'
              }}
            >
              Skip Setup (Use Defaults)
            </button>

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isSkipping}
              icon={<ArrowRight size={16} />}
            >
              Finish Setup
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};
