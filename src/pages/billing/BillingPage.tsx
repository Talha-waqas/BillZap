import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Check, 
  ArrowUpRight,
  TrendingUp,
  Infinity as InfinityIcon,
  Loader
} from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { invoiceService } from '../../services/invoiceService';
import { Business, Subscription } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase/client';

interface BillingPageProps {
  business: Business;
  subscription: Subscription;
  onSubscriptionUpdate: (updated: Subscription) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({
  business,
  subscription,
  onSubscriptionUpdate,
  onToast,
}) => {
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadUsageStats = async () => {
    setIsLoading(true);
    try {
      const count = await invoiceService.getInvoicesCountThisMonth();
      setInvoiceCount(count);
    } catch (err) {
      console.error(err);
      onToast('Failed to load current month invoice usage stats.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsageStats();
  }, []);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleUpgrade = async () => {
    setIsUpdating(true);
    onToast('Processing payment simulation...', 'success');
    
    try {
      const success = await subscriptionService.upgradeToPro();
      if (success) {
        // Fetch fresh subscription details
        const updatedSub = await subscriptionService.getSubscription();
        if (updatedSub) {
          onSubscriptionUpdate(updatedSub);
          onToast('Subscription upgraded to Pro! All features unlocked.', 'success');
          setIsPaymentModalOpen(false);
        }
      } else {
        onToast('Payment simulation failed.', 'error');
      }
    } catch (err: any) {
      onToast('Upgrade failed: ' + err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWhatsAppPaymentProof = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'N/A';
      
      const message = `Hi Talha! I just made the payment of Rs. 499 for BillZap Pro. Please activate my account.\n\nBusiness Details:\n- Name: ${business.name}\n- Registered Email: ${userEmail}\n- Phone: ${business.phone || 'N/A'}`;
      const encodedText = encodeURIComponent(message);
      
      const waLink = `https://wa.me/923228964384?text=${encodedText}`;
      window.open(waLink, '_blank');
    } catch (err) {
      console.error(err);
      onToast('Failed to generate payment proof details.', 'error');
    }
  };

  const handleCancel = async () => {
    setIsUpdating(true);
    try {
      const success = await subscriptionService.cancelPro();
      if (success) {
        const updatedSub = await subscriptionService.getSubscription();
        if (updatedSub) {
          onSubscriptionUpdate(updatedSub);
          onToast('Subscription cancelled. Reverted to Free Plan.', 'success');
        }
      }
    } catch (err: any) {
      onToast('Cancellation failed: ' + err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const freePercentage = Math.min(100, (invoiceCount / 10) * 100);

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="skeleton" style={{ width: '150px', height: '2rem', marginBottom: 'var(--space-xl)' }} />
        <div className="skeleton" style={{ height: '150px', marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Billing</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your plan subscription and monitor invoice quotas.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        
        {/* Usage Bar Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Current Plan</span>
              <h2 style={{ fontSize: '1.5rem', textTransform: 'capitalize' }}>
                {subscription.plan} Plan
              </h2>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Cycle Usage</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {subscription.plan === 'free' ? (
                  <span>{invoiceCount} / 10 invoices</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{invoiceCount} / </span>
                    <InfinityIcon size={16} style={{ color: 'var(--color-primary)' }} />
                  </span>
                )}
              </div>
            </div>
          </div>

          {subscription.plan === 'free' && (
            <div>
              {/* Progress Bar wrapper */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: 'var(--space-xs)' }}>
                <div style={{ width: `${freePercentage}%`, height: '100%', backgroundColor: freePercentage >= 100 ? 'var(--color-danger)' : 'var(--color-primary)', borderRadius: '4px', transition: 'width 300ms ease' }} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {invoiceCount >= 10 
                  ? "You've reached your free monthly limit. Please upgrade to Pro to continue creating invoices."
                  : `You have used ${invoiceCount} out of 10 free invoices. Quota resets monthly.`}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Comparison Matrix Grid */}
        <div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-md)', fontFamily: 'var(--font-heading)' }}>Plans</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            
            {/* Free */}
            <div className="pricing-card" style={{ border: subscription.plan === 'free' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', opacity: subscription.plan === 'pro' ? 0.7 : 1 }}>
              {subscription.plan === 'free' && <span className="pricing-tag">ACTIVE PLAN</span>}
              <h4 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-2xs)' }}>Free Plan</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Rs. 0 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/month</span></div>
              
              <ul className="pricing-features-list" style={{ flex: 1 }}>
                <li><Check size={14} /> <span>10 invoices/month limits</span></li>
                <li><Check size={14} /> <span>Basic PDF invoices</span></li>
                <li><Check size={14} /> <span>WhatsApp Click-to-Chat sharing</span></li>
                <li><Check size={14} /> <span>Invoice history logs</span></li>
              </ul>
            </div>

            {/* Pro */}
            <div className="pricing-card" style={{ border: subscription.plan === 'pro' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', opacity: subscription.plan === 'free' ? 1 : 0.9 }}>
              {subscription.plan === 'pro' && <span className="pricing-tag">ACTIVE PLAN</span>}
              <h4 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-2xs)' }}>Pro Plan</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Rs. 499 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/month</span></div>
              
              <ul className="pricing-features-list" style={{ flex: 1 }}>
                <li><Check size={14} /> <strong>Unlimited invoices</strong></li>
                <li><Check size={14} /> <span>Custom branding logo support</span></li>
                <li><Check size={14} /> <span>Remove "BillZap" footer branding</span></li>
                <li><Check size={14} /> <span>Customer billing statistics</span></li>
              </ul>

              {subscription.plan === 'free' ? (
                <Button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  style={{ width: '100%', marginTop: 'var(--space-md)' }}
                  icon={<ArrowUpRight size={16} />}
                >
                  Upgrade to Pro
                </Button>
              ) : (
                <Button 
                  onClick={handleCancel}
                  isLoading={isUpdating}
                  variant="outline"
                  style={{ width: '100%', marginTop: 'var(--space-md)', color: 'var(--color-danger)' }}
                >
                  Cancel Plan Subscription
                </Button>
              )}
            </div>

          </div>
        </div>

      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Upgrade to BillZap Pro"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            To unlock unlimited invoices, custom branding logo, and remove footer watermarks, please make a monthly payment of <strong>Rs. 499</strong>.
          </p>

          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>Payment Options</h4>
            
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Easypaisa / JazzCash</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '2px' }}>
                Account Number: <strong>03228964384</strong><br />
                Account Title: <strong>Talha</strong>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>NayaPay</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '2px' }}>
                NayaPay ID: <strong>talha.dev@nayapay</strong><br />
                Account Number: <strong>03228964384</strong><br />
                IBAN: <strong style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>PK07NAYA1234503228964384</strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>SadaPay</span>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '2px' }}>
                Account Number: <strong>03228964384</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: 'var(--space-2xs) 0' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Once transferred, click the button below to send your payment screenshot on WhatsApp.
            </span>
          </div>

          <Button
            onClick={handleWhatsAppPaymentProof}
            style={{ width: '100%', backgroundColor: '#25D366', color: 'white', border: 'none' }}
          >
            Send Payment Proof via WhatsApp
          </Button>


        </div>
      </Modal>

    </div>
  );
};
