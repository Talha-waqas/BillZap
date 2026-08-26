import { supabase } from '../lib/supabase/client';
import { Subscription } from '../types';

export const subscriptionService = {
  /**
   * Fetch active subscription for the authenticated user
   */
  async getSubscription(): Promise<Subscription | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data as Subscription;
  },

  /**
   * Check if user is eligible to create a new invoice based on their current usage and plan
   */
  canCreateInvoice(plan: 'free' | 'pro', invoiceCountThisMonth: number): boolean {
    if (plan === 'pro') return true;
    return invoiceCountThisMonth < 10;
  },

  /**
   * Check if custom logo upload is enabled on the current plan
   */
  canUseCustomLogo(plan: 'free' | 'pro'): boolean {
    return plan === 'pro';
  },

  /**
   * Check if branding can be removed from generated PDFs
   */
  canRemoveBranding(plan: 'free' | 'pro'): boolean {
    return plan === 'pro';
  },

  /**
   * Upgrade user to Pro plan (Simulated payment callback interface)
   */
  async upgradeToPro(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // In a real system, this would redirect to Stripe / JazzCash payment link.
    // For MVP, we provide a clean update to make testing the Pro plan features seamless.
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to upgrade subscription:', error);
      return false;
    }

    return true;
  },

  /**
   * Downgrade or cancel Pro (Simulated callback interface)
   */
  async cancelPro(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        provider: 'system',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to downgrade subscription:', error);
      return false;
    }

    return true;
  }
};
