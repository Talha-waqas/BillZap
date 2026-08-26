import React, { useEffect, useState } from 'react';
import { Users, Star, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { Button } from '../../components/ui/Button';

interface AdminPageProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onToast }) => {
  const [stats, setStats] = useState({ total: 0, free: 0, pro: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subErr) throw subErr;

      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('user_id, name, phone, created_at');

      if (bizErr) throw bizErr;

      // Map business data by user_id
      const bizMap = (biz || []).reduce((acc: any, b: any) => {
        acc[b.user_id] = b;
        return acc;
      }, {});

      // Combine
      const combined = (subs || []).map((sub: any) => {
        const business = bizMap[sub.user_id];
        return {
          ...sub,
          businessName: business?.name || 'Onboarding Pending',
          businessPhone: business?.phone || 'N/A',
        };
      });

      setUsersList(combined);

      // Compute statistics
      const total = combined.length;
      const pro = combined.filter((u: any) => u.plan === 'pro').length;
      const free = total - pro;
      setStats({ total, free, pro });

    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to load admin data. Make sure RLS Policies are applied.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleTogglePlan = async (userId: string, currentPlan: 'free' | 'pro') => {
    const nextPlan = currentPlan === 'free' ? 'pro' : 'free';
    setIsUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan: nextPlan,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      onToast(`Subscription successfully updated to ${nextPlan.toUpperCase()}`, 'success');
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to change plan.', 'error');
    } finally {
      setIsUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="skeleton" style={{ width: '150px', height: '2rem', marginBottom: 'var(--space-xl)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
        </div>
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem var(--space-md)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage user subscriptions and inspect system registrations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button 
            onClick={() => window.location.hash = '#dashboard'}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Back to Retail App
          </button>
          <button 
            onClick={loadAdminData}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              padding: 'var(--space-xs) var(--space-sm)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Stats Scoreboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 'var(--space-md)', 
        marginBottom: 'var(--space-lg)' 
      }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Users</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Star size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pro Users</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.pro}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Free Users</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.free}</div>
          </div>
        </div>

      </div>

      {/* Users management table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Business Name</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Email</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Current Plan</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Joined Date</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No users found in database.
                </td>
              </tr>
            ) : (
              usersList.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 500 }}>
                    <div>{user.businessName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{user.businessPhone}</div>
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                    {user.email || 'N/A'}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: user.plan === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: user.plan === 'pro' ? 'var(--color-success)' : 'var(--text-secondary)'
                    }}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right' }}>
                    <Button
                      variant={user.plan === 'pro' ? 'outline' : 'primary'}
                      onClick={() => handleTogglePlan(user.user_id, user.plan)}
                      isLoading={isUpdatingId === user.user_id}
                      style={{ 
                        padding: '0.4rem 0.8rem', 
                        fontSize: '0.75rem', 
                        borderColor: user.plan === 'pro' ? 'var(--color-danger)' : undefined,
                        color: user.plan === 'pro' ? 'var(--color-danger)' : undefined
                      }}
                    >
                      {user.plan === 'pro' ? 'Revoke Pro' : 'Make Pro'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
