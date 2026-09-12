export interface Business {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency: string;
  invoice_prefix: string;
  last_invoice_number: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  // Extra properties for management
  invoice_count?: number;
  total_billed?: number;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id?: string | null;
  invoice_number: string;
  sequence_number: number;
  subtotal: number;
  discount: number;
  total: number;
  status: 'Paid' | 'Unpaid';
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: string;
  provider: string;
  provider_customer_id?: string;
  provider_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export type ReferralStatus = 
  | 'invited' 
  | 'signed_up' 
  | 'invoice_created' 
  | 'qualified_free' 
  | 'qualified_pro' 
  | 'reward_counted' 
  | 'revoked';

export interface ReferralProfile {
  user_id: string;
  referral_code: string;
  referred_by_id?: string | null;
  total_pro_qualified: number;
  total_free_qualified: number;
  total_rewards_earned: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: ReferralStatus;
  has_created_invoice: boolean;
  plan_at_qualification: 'free' | 'pro';
  counted_in_reward_id?: string | null;
  created_at: string;
  updated_at: string;
  // Join fields from businesses / auth
  business_name?: string;
  referred_email?: string;
}

export interface ReferralReward {
  id: string;
  user_id: string;
  reward_type: string;
  days_granted: number;
  status: 'active' | 'expired' | 'revoked';
  pro_referrals_used: number;
  free_referrals_used: number;
  granted_at: string;
  expires_at: string;
  created_at: string;
}
