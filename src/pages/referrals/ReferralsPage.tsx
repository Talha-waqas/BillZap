import React, { useEffect, useState } from 'react';
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Zap, 
  Award, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { referralService } from '../../services/referralService';
import { ReferralProfile, ReferralRecord, ReferralReward, Business } from '../../types';
import { Button } from '../../components/ui/Button';

interface ReferralsPageProps {
  business: Business;
  onToast: (msg: string, type: 'success' | 'error') => void;
  onNavigate: (path: string) => void;
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({
  business,
  onToast,
  onNavigate,
}) => {
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userProfile, userReferrals, userRewards] = await Promise.all([
        referralService.getOrCreateProfile(),
        referralService.getReferralsList(),
        referralService.getRewards(),
      ]);

      setProfile(userProfile);
      setReferrals(userReferrals);
      setRewards(userRewards);
    } catch (err: any) {
      console.error(err);
      onToast('Failed to load referral data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live counts towards reward
  // Qualified Pro: status === 'qualified_pro' or count of reward_counted Pro
  const unrewardedProCount = referrals.filter(r => r.status === 'qualified_pro' && !r.counted_in_reward_id).length;
  const unrewardedFreeCount = referrals.filter(r => r.status === 'qualified_free' && !r.counted_in_reward_id).length;
  
  // Progress calculations: 3 Pro + 5 Free = 8 total needed
  const proGoal = 3;
  const freeGoal = 5;
  const proProgress = Math.min(unrewardedProCount, proGoal);
  const freeProgress = Math.min(unrewardedFreeCount, freeGoal);
  const totalProgress = proProgress + freeProgress;
  const totalGoal = proGoal + freeGoal; // 8
  const progressPercent = Math.min(100, Math.round((totalProgress / totalGoal) * 100));

  const referralCode = profile?.referral_code || '...';
  const baseUrl = window.location.origin + window.location.pathname;
  const referralLink = `${baseUrl}#signup?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    onToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! I use BillZap to create & send professional GST/receipt invoices on WhatsApp in 20 seconds. Join using my referral link and try it for free: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reward_counted':
        return (
          <span style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
            color: 'var(--color-success)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle2 size={12} /> Reward Counted
          </span>
        );
      case 'qualified_pro':
        return (
          <span style={{ 
            backgroundColor: 'rgba(59, 130, 246, 0.15)', 
            color: '#60a5fa', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Zap size={12} /> Qualified — Pro
          </span>
        );
      case 'qualified_free':
        return (
          <span style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
            color: 'var(--color-success)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Check size={12} /> Qualified — Free
          </span>
        );
      case 'invoice_created':
        return (
          <span style={{ 
            backgroundColor: 'rgba(245, 158, 11, 0.15)', 
            color: 'var(--color-warning)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 600 
          }}>
            Invoice Created
          </span>
        );
      case 'signed_up':
        return (
          <span style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
            color: 'var(--text-secondary)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 500 
          }}>
            Signed Up (Pending Invoice)
          </span>
        );
      case 'revoked':
        return (
          <span style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            color: 'var(--color-danger)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 600 
          }}>
            Revoked
          </span>
        );
      default:
        return (
          <span style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
            color: 'var(--text-secondary)', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem' 
          }}>
            {status}
          </span>
        );
    }
  };

  const activeReward = rewards.find(r => r.status === 'active');

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="skeleton" style={{ width: '260px', height: '2rem', marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ width: '100%', height: '140px', marginBottom: 'var(--space-xl)' }} />
        <div className="skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      
      {/* Active Reward Congratulations Banner if earned */}
      {activeReward && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-round)',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Sparkles size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>🎉 Congratulations! Reward Active</h3>
                <span style={{ 
                  backgroundColor: 'var(--color-primary)', 
                  color: '#09090b', 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  3 MONTHS PRO
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                You successfully referred 3 Pro and 5 Free sellers! Your 90 Days of Free Pro access is active until{' '}
                <strong style={{ color: '#fff' }}>{new Date(activeReward.expires_at).toLocaleDateString()}</strong>.
              </p>
            </div>
          </div>
          <Button
            onClick={() => onNavigate('billing')}
            variant="outline"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontSize: '0.85rem' }}
          >
            View Pro Status
          </Button>
        </div>
      )}

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 140, 126, 0.02) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginBottom: 'var(--space-xl)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--color-primary)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: 'var(--space-sm)'
          }}>
            <Gift size={14} /> REFER & GET 3 MONTHS PRO FREE
          </div>
          
          <h1 style={{ 
            fontSize: '2rem', 
            fontFamily: 'var(--font-heading)', 
            fontWeight: 700, 
            letterSpacing: '-0.02em', 
            marginBottom: 'var(--space-xs)' 
          }}>
            Invite Business Owners. Earn 90 Days of Pro.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 'var(--space-lg)' }}>
            Share BillZap with fellow shop owners and freelancers. Refer <strong>3 Pro subscribers</strong> + <strong>5 Free users</strong> (who create at least 1 invoice) to unlock <strong>3 Months of Free Pro</strong> automatically!
          </p>

          {/* Referral Code & Share Link Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your Unique Referral Link:</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Referral Code: <strong style={{ color: 'var(--color-primary)', letterSpacing: '1px' }}>{referralCode}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={referralLink}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace'
                }}
              />
              <Button
                onClick={handleCopyLink}
                icon={copied ? <Check size={16} /> : <Copy size={16} />}
                style={{ fontSize: '0.85rem' }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                onClick={handleShareWhatsApp}
                icon={<Share2 size={16} />}
                style={{ 
                  backgroundColor: '#25D366', 
                  color: '#ffffff', 
                  border: 'none', 
                  fontSize: '0.85rem' 
                }}
              >
                Share on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Scoreboard Grid */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
          Your Referral Progress
        </h2>

        {/* Overall Progress Bar */}
        <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xs)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Progress Toward 90 Days Free Pro
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2px' }}>
                {totalProgress} / {totalGoal} Qualified Referrals
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {progressPercent}%
            </div>
          </div>

          <div style={{ 
            width: '100%', 
            height: '10px', 
            backgroundColor: 'rgba(255,255,255,0.06)', 
            borderRadius: '6px', 
            overflow: 'hidden',
            marginBottom: 'var(--space-xs)'
          }}>
            <div style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              backgroundColor: 'var(--color-primary)', 
              borderRadius: '6px',
              transition: 'width 400ms ease',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
            }} />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            {progressPercent >= 100 
              ? "🎉 You've reached the requirement! Your 90 Days of Free Pro access has been activated."
              : `Need ${Math.max(0, proGoal - unrewardedProCount)} more Pro referral${proGoal - unrewardedProCount === 1 ? '' : 's'} and ${Math.max(0, freeGoal - unrewardedFreeCount)} more Free referral${freeGoal - unrewardedFreeCount === 1 ? '' : 's'} to earn 3 Months of Free Pro.`}
          </p>
        </div>

        {/* Breakdown Sub-cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              color: '#3b82f6', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <Zap size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pro Referrals</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {unrewardedProCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {proGoal}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: unrewardedProCount >= proGoal ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {unrewardedProCount >= proGoal ? '✓ Goal Met' : `${proGoal - unrewardedProCount} remaining`}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              color: 'var(--color-primary)', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <Users size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Free Referrals</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {unrewardedFreeCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {freeGoal}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: unrewardedFreeCount >= freeGoal ? 'var(--color-success)' : 'var(--text-muted)' }}>
                {unrewardedFreeCount >= freeGoal ? '✓ Goal Met' : `${freeGoal - unrewardedFreeCount} remaining`}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              color: 'var(--color-warning)', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <Award size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rewards Earned</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {profile?.total_rewards_earned || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                90-Day Pro Grants
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ 
              backgroundColor: 'rgba(139, 92, 246, 0.1)', 
              color: '#a78bfa', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Invited</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                {referrals.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Registered Sellers
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Rules Explainer Box */}
      <div className="card" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid var(--border-color)', 
        marginBottom: 'var(--space-xl)',
        padding: 'var(--space-lg)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-sm)' }}>
          <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} /> How Qualified Referrals Work:
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 'var(--space-md)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>1. Sign Up</strong>
            <p style={{ margin: '4px 0 0' }}>The invited business owner creates an account using your referral link or enters your code.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>2. Create an Invoice</strong>
            <p style={{ margin: '4px 0 0' }}>They must complete business setup and generate at least 1 invoice to qualify.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>3. Pro vs Free</strong>
            <p style={{ margin: '4px 0 0' }}>If they upgrade to Pro, they count as a Pro referral. If on Free, they count as a Free referral.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>4. Auto-Reward</strong>
            <p style={{ margin: '4px 0 0' }}>Once you reach 3 Pro + 5 Free qualified users, 90 Days of Pro are added to your account instantly.</p>
          </div>
        </div>
      </div>

      {/* Referrals History Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            Invited Businesses ({referrals.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Real-time qualification status
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Business Name</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Signed Up Date</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>First Invoice</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Referral Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Users size={32} style={{ margin: '0 auto var(--space-sm)', opacity: 0.5 }} />
                    <div>No businesses invited yet.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                      Share your referral link above on WhatsApp to get started!
                    </div>
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 500 }}>
                      {r.business_name}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      {r.has_created_invoice ? (
                        <span style={{ color: 'var(--color-success)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Created
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      {getStatusBadge(r.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
