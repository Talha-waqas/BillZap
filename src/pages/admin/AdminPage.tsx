import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Star, 
  ShieldAlert, 
  Check, 
  RefreshCw, 
  LogIn, 
  Lock, 
  Mail, 
  Receipt,
  Search,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { ADMIN_EMAILS } from '../../App';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface AdminPageProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
  session: any;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onToast, session }) => {
  // Login states for logged-out view
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab state: 'pro_users' | 'free_users' | 'customers' | 'invoices'
  const [activeTab, setActiveTab] = useState<'pro_users' | 'free_users' | 'customers' | 'invoices'>('pro_users');

  // Database states
  const [stats, setStats] = useState({ total: 0, free: 0, pro: 0, totalCustomers: 0, totalInvoices: 0, totalVolume: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      onToast('Please enter both email and password.', 'error');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userEmail = data.user?.email || '';
      if (!ADMIN_EMAILS.includes(userEmail)) {
        // If not admin, log out immediately
        await supabase.auth.signOut();
        onToast('Access Denied: Your email is not authorized as an administrator.', 'error');
      } else {
        onToast('Welcome back, Admin!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Login failed.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onToast('Logged out of Admin Portal.', 'success');
  };

  const loadAdminData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      // 1. Fetch subscriptions (users)
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subErr) throw subErr;

      // Silent Auto-revoke check: if any subscription is pro, has expired by more than 1 day, and is not active
      const now = new Date();
      if (subs) {
        for (const sub of subs) {
          if (sub.plan === 'pro') {
            const expiryDate = new Date(sub.current_period_end);
            const oneDayGracePeriod = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);
            
            if (now > oneDayGracePeriod && sub.status !== 'active') {
              await supabase
                .from('subscriptions')
                .update({
                  plan: 'free',
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', sub.user_id);
              
              sub.plan = 'free';
              sub.status = 'active';
            }
          }
        }
      }

      // 2. Fetch businesses (onboarding names)
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('user_id, name, phone, created_at');

      if (bizErr) throw bizErr;

      // 3. Fetch all customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (custErr) throw custErr;

      // 4. Fetch all invoices
      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;

      // Build maps for indexing business metadata in memory
      const bizMap = (biz || []).reduce((acc: any, b: any) => {
        acc[b.user_id] = b;
        return acc;
      }, {});

      const subEmailMap = (subs || []).reduce((acc: any, s: any) => {
        acc[s.user_id] = s.email || 'Unknown Email';
        return acc;
      }, {});

      // Combine subscriptions with business profile names
      const combinedUsers = (subs || []).map((sub: any) => {
        const business = bizMap[sub.user_id];
        return {
          ...sub,
          businessName: business?.name || 'Onboarding Pending',
          businessPhone: business?.phone || 'N/A',
        };
      });

      setUsersList(combinedUsers);

      // Combine customers with seller emails and business names
      const combinedCustomers = (custData || []).map((cust: any) => {
        const sellerEmail = subEmailMap[cust.user_id] || 'N/A';
        const business = bizMap[cust.user_id];
        return {
          ...cust,
          sellerEmail,
          sellerBusinessName: business?.name || 'N/A'
        };
      });

      setCustomersList(combinedCustomers);

      // Combine invoices with seller metadata
      const combinedInvoices = (invData || []).map((inv: any) => {
        const sellerEmail = subEmailMap[inv.user_id] || 'N/A';
        const business = bizMap[inv.user_id];
        return {
          ...inv,
          sellerEmail,
          sellerBusinessName: business?.name || 'N/A'
        };
      });

      setInvoicesList(combinedInvoices);

      // Calculate Statistics
      const total = combinedUsers.length;
      const pro = combinedUsers.filter((u: any) => u.plan === 'pro').length;
      const free = total - pro;
      
      const totalCustomers = combinedCustomers.length;
      const totalInvoices = combinedInvoices.length;
      const totalVolume = combinedInvoices.reduce((sum: number, i: any) => sum + i.total, 0);

      setStats({
        total,
        free,
        pro,
        totalCustomers,
        totalInvoices,
        totalVolume
      });

    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to load admin data. Verify Supabase RLS SQL policies are run.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      const userEmail = session.user?.email || '';
      if (ADMIN_EMAILS.includes(userEmail)) {
        loadAdminData();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [session]);

  // Date modal states
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const handleOpenEditDates = (user: any) => {
    setEditingSub(user);
    const startStr = user.current_period_start ? new Date(user.current_period_start).toISOString().split('T')[0] : '';
    const endStr = user.current_period_end ? new Date(user.current_period_end).toISOString().split('T')[0] : '';
    setEditStart(startStr);
    setEditEnd(endStr);
  };

  const handleSaveDates = async () => {
    if (!editingSub) return;
    setIsUpdatingId(editingSub.user_id);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          current_period_start: new Date(editStart).toISOString(),
          current_period_end: new Date(editEnd).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', editingSub.user_id);

      if (error) throw error;
      onToast('Subscription dates updated successfully.', 'success');
      setEditingSub(null);
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to save dates.', 'error');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (userId: string, statusVal: string, planVal?: string) => {
    setIsUpdatingId(userId);
    try {
      const updateData: any = {
        status: statusVal,
        updated_at: new Date().toISOString()
      };
      
      if (planVal) {
        updateData.plan = planVal;
      }

      // If marking as Paid, update start/end periods for next 30 days
      if (statusVal === 'active' && planVal === 'pro') {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(now.getDate() + 30);
        
        updateData.current_period_start = now.toISOString();
        updateData.current_period_end = nextMonth.toISOString();
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;
      onToast(`User status successfully updated to ${statusVal.toUpperCase()}`, 'success');
      await loadAdminData();
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const getWhatsAppReminderLink = (user: any) => {
    if (!user.businessPhone || user.businessPhone === 'N/A') return '#';
    
    // Calculate days remaining
    const expiry = new Date(user.current_period_end);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let daysMessage = `expires in ${diffDays} days`;
    if (diffDays === 0) daysMessage = `expires today`;
    if (diffDays < 0) daysMessage = `expired ${Math.abs(diffDays)} days ago`;

    const message = `Hi! This is a friendly reminder that your BillZap Pro subscription for *${user.businessName}* ${daysMessage} (on ${new Date(user.current_period_end).toLocaleDateString()}).\n\nTo renew and maintain unlimited invoice logs, please transfer *Rs. 499* to Easypaisa/JazzCash *03228964384* and send the payment proof screenshot. Thank you!`;
    const encoded = encodeURIComponent(message);
    
    const cleanPhone = user.businessPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
    
    return `https://wa.me/${finalPhone}?text=${encoded}`;
  };

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

  // --- RENDERS ---

  // A. Logged Out View
  if (!session) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        padding: 'var(--space-md)'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '420px', border: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-round)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-sm) auto'
            }}>
              <Lock size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>BillZap Admin Portal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Sign in with your administrator account.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Input
              label="Admin Email Address"
              type="email"
              placeholder="admin@billzap.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Security Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              isLoading={isLoggingIn}
              style={{ width: '100%', marginTop: 'var(--space-xs)' }}
              icon={<LogIn size={16} />}
            >
              Sign In to Admin
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
            <a href="#landing" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Back to main website
            </a>
          </div>
        </div>
      </div>
    );
  }

  // B. Logged in but NOT Admin
  const loggedInEmail = session.user?.email || '';
  if (!ADMIN_EMAILS.includes(loggedInEmail)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        padding: 'var(--space-md)'
      }}>
        <div className="card" style={{ width: '100%', maxWidth: '450px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--color-danger)', margin: '0 auto var(--space-md) auto' }} />
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
            Your account email (<strong>{loggedInEmail}</strong>) is not whitelisted in the administrator database.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
              Disconnect / Log Out
            </Button>
            <a href="#dashboard" className="btn btn-outline" style={{ display: 'block', textAlign: 'center' }}>
              Go to Retail Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // C. Main Admin Dashboard View
  const proUsers = usersList.filter(u => u.plan === 'pro');
  const freeUsers = usersList.filter(u => u.plan === 'free');

  const filteredProUsers = proUsers.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFreeUsers = freeUsers.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSellersList = activeTab === 'pro_users' ? filteredProUsers : filteredFreeUsers;

  const filteredCustomers = customersList.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm) ||
    c.sellerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoices = invoicesList.filter(i => 
    i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sellerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem var(--space-md)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>Admin Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            System dashboard for managing plans and inspecting CRM contacts/receipt volume.
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
            <span>Refresh</span>
          </button>

          <button 
            onClick={handleLogout}
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#ef4444', 
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats Scoreboard grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 'var(--space-md)', 
        marginBottom: 'var(--space-xl)' 
      }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Sellers</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.pro} Pro / {stats.free} Free</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CRM Contacts</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.totalCustomers}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered across app</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <Receipt size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Invoices</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.totalInvoices}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created receipts</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Volume</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>Rs. {stats.totalVolume.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Billed transaction value</div>
          </div>
        </div>

      </div>

      {/* Tabs Menu Controls */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        marginBottom: 'var(--space-md)',
        gap: 'var(--space-md)',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <button 
          onClick={() => { setActiveTab('pro_users'); setSearchTerm(''); }}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'none',
            border: 'none',
            color: activeTab === 'pro_users' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pro_users' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'pro_users' ? 600 : 400
          }}
        >
          Pro Users ({filteredProUsers.length})
        </button>

        <button 
          onClick={() => { setActiveTab('free_users'); setSearchTerm(''); }}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'none',
            border: 'none',
            color: activeTab === 'free_users' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'free_users' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'free_users' ? 600 : 400
          }}
        >
          Free Users ({filteredFreeUsers.length})
        </button>

        <button 
          onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'none',
            border: 'none',
            color: activeTab === 'customers' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'customers' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'customers' ? 600 : 400
          }}
        >
          CRM Contacts Directory ({filteredCustomers.length})
        </button>

        <button 
          onClick={() => { setActiveTab('invoices'); setSearchTerm(''); }}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'none',
            border: 'none',
            color: activeTab === 'invoices' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'invoices' ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'invoices' ? 600 : 400
          }}
        >
          Invoices Directory ({filteredInvoices.length})
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: 'var(--space-md)', position: 'relative' }}>
        <input 
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px 10px 36px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
      </div>

      {/* Table Data View Render */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
        
        {/* Render Tab 1: Sellers */}
        {(activeTab === 'pro_users' || activeTab === 'free_users') && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Business Profile</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Registered Email</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Subscription details</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Created Date</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeSellersList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No sellers found.
                  </td>
                </tr>
              ) : (
                activeSellersList.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 500 }}>
                      <div>{user.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{user.businessPhone}</div>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                      {user.email || 'N/A'}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          backgroundColor: user.plan === 'pro' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: user.plan === 'pro' ? 'var(--color-success)' : 'var(--text-secondary)'
                        }}>
                          {user.plan.toUpperCase()}
                        </span>
                        
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          backgroundColor: user.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : user.status === 'unpaid' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: user.status === 'active' ? 'var(--color-success)' : user.status === 'unpaid' ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {user.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Start: {new Date(user.current_period_start).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>End: {new Date(user.current_period_end).toLocaleDateString()}</span>
                        {(() => {
                          const expiry = new Date(user.current_period_end);
                          const now = new Date();
                          const diffTime = expiry.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (user.plan === 'pro') {
                            if (diffDays < 0) return <span style={{ color: 'var(--color-danger)', fontSize: '0.7rem' }}>(Expired)</span>;
                            if (diffDays <= 3) return <span style={{ color: 'var(--color-warning)', fontSize: '0.7rem' }}>(Expires soon)</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        
                        {/* Toggle Plan / Paid Button */}
                        {user.plan === 'free' ? (
                          <Button
                            variant="primary"
                            onClick={() => handleUpdateStatus(user.user_id, 'active', 'pro')}
                            isLoading={isUpdatingId === user.user_id}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem' }}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <>
                            {user.status !== 'active' ? (
                              <Button
                                variant="primary"
                                onClick={() => handleUpdateStatus(user.user_id, 'active', 'pro')}
                                isLoading={isUpdatingId === user.user_id}
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem' }}
                              >
                                Mark Paid
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateStatus(user.user_id, 'unpaid', 'pro')}
                                isLoading={isUpdatingId === user.user_id}
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                              >
                                Mark Unpaid
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              onClick={() => handleTogglePlan(user.user_id, 'pro')}
                              isLoading={isUpdatingId === user.user_id}
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                            >
                              Revoke Pro
                            </Button>
                          </>
                        )}

                        {/* Ban / Unban Button */}
                        {user.status === 'banned' ? (
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateStatus(user.user_id, 'active')}
                            isLoading={isUpdatingId === user.user_id}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem' }}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateStatus(user.user_id, 'banned')}
                            isLoading={isUpdatingId === user.user_id}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                          >
                            Ban
                          </Button>
                        )}

                        {/* Edit Dates Button */}
                        <Button
                          variant="outline"
                          onClick={() => handleOpenEditDates(user)}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.7rem', color: '#8b5cf6', borderColor: '#8b5cf6' }}
                        >
                          Dates
                        </Button>

                        {/* WhatsApp Reminder Button */}
                        {(() => {
                          const expiry = new Date(user.current_period_end);
                          const now = new Date();
                          const diffTime = expiry.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isExpiring = user.plan === 'pro' && (diffDays <= 3);
                          
                          if (isExpiring && user.businessPhone !== 'N/A') {
                            return (
                              <a
                                href={getWhatsAppReminderLink(user)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                                style={{ 
                                  padding: '0.35rem 0.65rem', 
                                  fontSize: '0.7rem', 
                                  borderColor: '#25D366', 
                                  color: '#25D366',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none'
                                }}
                              >
                                Send Reminder
                              </a>
                            );
                          }
                          return null;
                        })()}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Render Tab 2: Customers */}
        {activeTab === 'customers' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Customer Details</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Contact Email</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Business Owner</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No customer records matching the search filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 500 }}>
                      <div>{cust.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.phone || 'No phone'}</div>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                      {cust.email || 'N/A'}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <div>{cust.sellerBusinessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.sellerEmail}</div>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(cust.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Render Tab 3: Invoices */}
        {activeTab === 'invoices' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Invoice #</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Customer</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Business Owner</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Amount</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Status</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)' }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No invoice records matching the search filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                      {inv.customer_name || 'Walk-in Customer'}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <div>{inv.sellerBusinessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.sellerEmail}</div>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontWeight: 700 }}>
                      Rs. {inv.total.toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: inv.status === 'Paid' ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* Date Editing Modal */}
      <Modal
        isOpen={!!editingSub}
        onClose={() => setEditingSub(null)}
        title="Edit Subscription Dates"
      >
        {editingSub && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Set custom subscription and expiry dates for <strong>{editingSub.businessName}</strong> ({editingSub.email}).
            </p>
            
            <Input
              label="Subscription Start Date"
              type="date"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
            />
            
            <Input
              label="Subscription Expiry Date"
              type="date"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <Button variant="outline" onClick={() => setEditingSub(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDates} isLoading={isUpdatingId === editingSub.user_id}>
                Save Dates
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
