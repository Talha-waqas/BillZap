import React, { useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, ArrowRight, Check, Zap } from 'lucide-react';
import { Business } from '../../types';

interface OnboardingPageProps {
  onOnboardingComplete: (business: Business) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onOnboardingComplete,
  onToast,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const nextStep = () => {
    // Basic validations per step
    if (step === 1 && !businessName.trim()) {
      setValidationError('Business Name is required.');
      return;
    }
    if (step === 3 && !phone.trim()) {
      setValidationError('Business Phone number is required.');
      return;
    }
    if (step === 4 && !email.trim()) {
      setValidationError('Business Email is required.');
      return;
    }
    if (step === 5 && !address.trim()) {
      setValidationError('Business Address is required.');
      return;
    }

    setValidationError('');
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setValidationError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setValidationError('');

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
        name: businessName,
        logo_url: logoUrl || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        currency,
        invoice_prefix: invoicePrefix || 'INV-',
        last_invoice_number: 0,
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      console.error('Error saving business profile:', error);
      onToast(error.message, 'error');
      setValidationError(error.message);
    } else {
      onToast('Business setup completed!', 'success');
      onOnboardingComplete(data as Business);
      window.location.hash = '#dashboard';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', marginBottom: 'var(--space-2xs)' }}>
            <Zap size={24} fill="var(--color-primary)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem' }}>BillZap Onboarding</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Step {step} of {totalSteps}
          </span>
        </div>

        {/* Custom Progress Dots */}
        <div style={{ display: 'flex', gap: 'var(--space-2xs)', justifyContent: 'center', marginBottom: 'var(--space-xl)' }}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              style={{
                height: '6px',
                width: step === idx + 1 ? '24px' : '6px',
                borderRadius: '3px',
                backgroundColor: step === idx + 1 
                  ? 'var(--color-primary)' 
                  : idx + 1 < step 
                    ? 'rgba(16, 185, 129, 0.4)' 
                    : 'var(--border-color)',
                transition: 'all 200ms ease'
              }}
            />
          ))}
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

        {/* Step Views */}
        <div style={{ minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                What is your Business Name?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                This is displayed at the top of your invoices.
              </p>
              <Input
                type="text"
                placeholder="e.g. NØRTH Clothing"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                Do you have a Business Logo URL?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Optional. Enter a direct web link to your PNG/JPG logo to print it on invoices.
              </p>
              <Input
                type="url"
                placeholder="e.g. https://domain.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                What is your Business Phone Number?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Used by customers to contact you.
              </p>
              <Input
                type="text"
                placeholder="e.g. 0300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                What is your Business Contact Email?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Invoices will display this as your support contact email.
              </p>
              <Input
                type="email"
                placeholder="e.g. hello@northclothing.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                What is your Business Physical Address?
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Optional but recommended. Prints on invoice header.
              </p>
              <Input
                type="text"
                placeholder="e.g. Office 14, DHA Phase 5, Karachi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {step === 6 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                Select Your Currency
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Default is PKR. You can customize this here.
              </p>
              <Select
                options={[
                  { value: 'PKR', label: 'PKR — Pakistani Rupee (Rs.)' },
                  { value: 'USD', label: 'USD — US Dollar ($)' },
                  { value: 'AED', label: 'AED — UAE Dirham' },
                  { value: 'GBP', label: 'GBP — British Pound (£)' },
                ]}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          )}

          {step === 7 && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
                Choose Your Invoice Number Prefix
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                This is prepended to sequence numbers. E.g. INV-0001.
              </p>
              <Select
                options={[
                  { value: 'INV-', label: 'INV- (e.g. INV-0001)' },
                  { value: 'BILL-', label: 'BILL- (e.g. BILL-0001)' },
                  { value: 'ORD-', label: 'ORD- (e.g. ORD-0001)' },
                  { value: 'REC-', label: 'REC- (e.g. REC-0001)' },
                ]}
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Actions Button Panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button
              onClick={nextStep}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              isLoading={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Check size={16} />
              <span>Finish</span>
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
