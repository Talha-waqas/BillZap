import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Settings as SettingsIcon, Building, ShieldAlert, Key } from 'lucide-react';
import { Business } from '../../types';

interface SettingsPageProps {
  business: Business;
  userName: string;
  onBusinessUpdate: (updated: Business) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  business,
  userName,
  onBusinessUpdate,
  onToast,
}) => {
  // Business Profile states
  const [bizName, setBizName] = useState(business.name || '');
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [email, setEmail] = useState(business.email || '');
  const [address, setAddress] = useState(business.address || '');
  const [currency, setCurrency] = useState(business.currency || 'PKR');
  const [invoicePrefix, setInvoicePrefix] = useState(business.invoice_prefix || 'INV-');
  const [isSavingBiz, setIsSavingBiz] = useState(false);

  // Account / Password update states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) {
      onToast('Business Name is required.', 'error');
      return;
    }

    setIsSavingBiz(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({
          name: bizName,
          logo_url: logoUrl || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          currency,
          invoice_prefix: invoicePrefix,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id)
        .select()
        .single();

      if (error) throw error;

      onToast('Business profile updated successfully!', 'success');
      onBusinessUpdate(data as Business);
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to update business settings.', 'error');
    } finally {
      setIsSavingBiz(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      onToast('Password cannot be empty.', 'error');
      return;
    }

    if (password.length < 6) {
      onToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      onToast('Passwords do not match.', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      onToast('Password updated successfully!', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="main-content">
      
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Adjust your business profile and security configuration details.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        
        {/* Business Settings Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
            <Building size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Business Profile</h3>
          </div>

          <form onSubmit={handleUpdateBusiness}>
            <div className="responsive-form-grid">
              <Input
                label="Business Name *"
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                required
              />
              <Input
                label="Logo Image URL"
                type="url"
                placeholder="https://yourwebsite.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <Input
                label="Business Phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Contact Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="col-span-2">
                <Input
                  label="Physical Address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              
              <Select
                label="Currency preference"
                options={[
                  { value: 'PKR', label: 'PKR — Pakistani Rupee (Rs.)' },
                  { value: 'USD', label: 'USD — US Dollar ($)' },
                  { value: 'AED', label: 'AED — UAE Dirham' },
                  { value: 'GBP', label: 'GBP — British Pound (£)' },
                ]}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />

              <Select
                label="Invoice number prefix"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <Button type="submit" isLoading={isSavingBiz}>
                Save Business Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Security / Password reset Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
            <Key size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '1.15rem' }}>Security Settings</h3>
          </div>

          <form onSubmit={handleUpdatePassword}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
              Change the password for account: <strong>{userName}</strong>
            </p>
            
            <div className="responsive-form-grid">
              <Input
                label="New Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <Button type="submit" isLoading={isSavingPassword} variant="outline">
                Update Account Password
              </Button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
};
