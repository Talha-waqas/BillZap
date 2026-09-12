import { supabase } from '../lib/supabase/client';
import { ReferralProfile, ReferralRecord, ReferralReward } from '../types';

/**
 * Generate a random alphanumeric uppercase referral code (e.g. BZ7K92M)
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BZ';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const referralService = {
  /**
   * Get or initialize referral profile for the current user
   */
  async getOrCreateProfile(): Promise<ReferralProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try fetching existing
    const { data, error } = await supabase
      .from('user_referral_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral profile:', error);
    }

    if (data) return data as ReferralProfile;

    // If not found, create new referral code
    const newCode = generateCode();
    const { data: created, error: insertErr } = await supabase
      .from('user_referral_profiles')
      .insert({
        user_id: user.id,
        referral_code: newCode,
        total_pro_qualified: 0,
        total_free_qualified: 0,
        total_rewards_earned: 0,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Error creating referral profile:', insertErr);
      return null;
    }

    return created as ReferralProfile;
  },

  /**
   * Look up a user ID by their referral code (for registration)
   */
  async lookupReferrerByCode(code: string): Promise<string | null> {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();

    const { data, error } = await supabase
      .from('user_referral_profiles')
      .select('user_id')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (error || !data) return null;
    return data.user_id;
  },

  /**
   * Record a referral link when a new user signs up
   */
  async linkReferredUser(newUserId: string, referralCode: string): Promise<boolean> {
    try {
      const referrerId = await this.lookupReferrerByCode(referralCode);
      if (!referrerId) return false;

      // Anti-abuse: cannot refer self
      if (referrerId === newUserId) return false;

      // Set referred_by_id on user's referral profile
      await supabase
        .from('user_referral_profiles')
        .upsert({
          user_id: newUserId,
          referral_code: generateCode(),
          referred_by_id: referrerId,
        });

      // Insert record in referrals table
      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_user_id: newUserId,
          status: 'signed_up',
          has_created_invoice: false,
          plan_at_qualification: 'free',
        });

      if (error) {
        console.error('Error linking referral:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('linkReferredUser failed:', err);
      return false;
    }
  },

  /**
   * Get all referrals made by current user, including business name and status
   */
  async getReferralsList(): Promise<ReferralRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting referrals:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Fetch business profiles for the referred users
    const referredIds = data.map((r: any) => r.referred_user_id);
    const { data: businesses } = await supabase
      .from('businesses')
      .select('user_id, name')
      .in('user_id', referredIds);

    const bizMap = new Map<string, string>();
    if (businesses) {
      businesses.forEach((b: any) => bizMap.set(b.user_id, b.name));
    }

    return data.map((r: any) => ({
      ...r,
      business_name: bizMap.get(r.referred_user_id) || 'Business Setup Pending',
    })) as ReferralRecord[];
  },

  /**
   * Get rewards earned by current user
   */
  async getRewards(): Promise<ReferralReward[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting rewards:', error);
      return [];
    }

    return (data || []) as ReferralReward[];
  },

  /**
   * Trigger backend function to evaluate reward eligibility
   */
  async evaluateReward(): Promise<{ success: boolean; reward_id?: string; days_granted?: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    try {
      const { data, error } = await supabase.rpc('check_and_award_referral_reward', {
        p_referrer_id: user.id,
      });

      if (error) {
        console.error('Error evaluating reward:', error);
        return { success: false };
      }

      return data || { success: false };
    } catch (err) {
      console.error('RPC call error:', err);
      return { success: false };
    }
  },

  /**
   * Check if referred user just created an invoice and update referral status
   */
  async notifyInvoiceCreated(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Check if user was referred and hasn't created an invoice yet
      const { data: ref } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', user.id)
        .maybeSingle();

      if (ref && !ref.has_created_invoice) {
        // Fetch current subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .maybeSingle();

        const isPro = sub?.plan === 'pro' && sub?.status === 'active';
        const newStatus = isPro ? 'qualified_pro' : 'qualified_free';

        await supabase
          .from('referrals')
          .update({
            has_created_invoice: true,
            status: newStatus,
            plan_at_qualification: isPro ? 'pro' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ref.id);

        // Call evaluate reward on referrer
        await supabase.rpc('check_and_award_referral_reward', {
          p_referrer_id: ref.referrer_id,
        });
      }
    } catch (e) {
      console.error('notifyInvoiceCreated error:', e);
    }
  },

  /**
   * ADMIN: Fetch all referrals with referrer and referred details
   */
  async getAdminReferrals(): Promise<any[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin referrals error:', error);
      return [];
    }

    if (!data) return [];

    // Collect all unique user IDs
    const userIds = Array.from(new Set([
      ...data.map((r: any) => r.referrer_id),
      ...data.map((r: any) => r.referred_user_id)
    ]));

    // Fetch businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('user_id, name, phone, email')
      .in('user_id', userIds);

    const bizMap = new Map<string, any>();
    if (businesses) {
      businesses.forEach((b: any) => bizMap.set(b.user_id, b));
    }

    return data.map((r: any) => ({
      ...r,
      referrer_business: bizMap.get(r.referrer_id)?.name || 'Seller',
      referrer_phone: bizMap.get(r.referrer_id)?.phone || '',
      referred_business: bizMap.get(r.referred_user_id)?.name || 'Seller',
      referred_phone: bizMap.get(r.referred_user_id)?.phone || '',
    }));
  },

  /**
   * ADMIN: Revoke / Flag fraudulent referral
   */
  async revokeReferral(referralId: string): Promise<boolean> {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId);

    if (error) {
      console.error('Error revoking referral:', error);
      return false;
    }
    return true;
  }
};
