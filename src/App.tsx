import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase/client';
import { ShieldAlert } from 'lucide-react';
import { subscriptionService } from './services/subscriptionService';
import { Business, Subscription } from './types';

// Layouts
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { InvoiceForm } from './components/invoice/InvoiceForm';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { BillingPage } from './pages/billing/BillingPage';
import { AdminPage } from './pages/admin/AdminPage';

export const ADMIN_EMAILS = ['talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'];

// Simple Toast Notification model
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

// Simple Hash Router model
type Route =
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'forgot-password' }
  | { name: 'onboarding' }
  | { name: 'dashboard' }
  | { name: 'invoices' }
  | { name: 'invoice-create' }
  | { name: 'invoice-edit'; id: string }
  | { name: 'invoice-detail'; id: string }
  | { name: 'customers' }
  | { name: 'customer-detail'; id: string }
  | { name: 'settings' }
  | { name: 'billing' }
  | { name: 'admin' };

function parseLocation(): Route {
  if (window.location.pathname === '/admin') {
    return { name: 'admin' };
  }

  const cleanHash = window.location.hash.replace(/^#/, '');
  const [path, queryString] = cleanHash.split('?');
  const params = new URLSearchParams(queryString || '');
  const id = params.get('id') || '';

  switch (path) {
    case 'login': return { name: 'login' };
    case 'signup': return { name: 'signup' };
    case 'forgot-password': return { name: 'forgot-password' };
    case 'onboarding': return { name: 'onboarding' };
    case 'dashboard': return { name: 'dashboard' };
    case 'invoices': return { name: 'invoices' };
    case 'invoice-create': return { name: 'invoice-create' };
    case 'invoice-edit': return { name: 'invoice-edit', id };
    case 'invoice-detail': return { name: 'invoice-detail', id };
    case 'customers': return { name: 'customers' };
    case 'customer-detail': return { name: 'customer-detail', id };
    case 'settings': return { name: 'settings' };
    case 'billing': return { name: 'billing' };
    case 'admin': return { name: 'admin' };
    default: return { name: 'landing' };
  }
}

function App() {
  const [route, setRoute] = useState<Route>({ name: 'landing' });
  const [session, setSession] = useState<any>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 1. Toast Trigger Helper
  const triggerToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 2. Hash & Pathname Router Listener
  useEffect(() => {
    const handleLocationChange = () => {
      const parsed = parseLocation();
      setRoute(parsed);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange(); // Run once initially

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // 3. Supabase Authentication listener with connection timeout safety net
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAppLoading(false);
      return;
    }

    // Safety Net: Loader timeout fallback (5 seconds)
    // If Supabase API hangs (e.g. database is paused or recovering), we release the loading block.
    const fallbackTimer = setTimeout(() => {
      setIsAppLoading((loading) => {
        if (loading) {
          console.warn("Supabase initial load timed out. Releasing loader fallback.");
          triggerToast("Supabase connection is taking longer than usual. Please check if your database is restoring.", "error");
          return false;
        }
        return loading;
      });
    }, 5000);

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      clearTimeout(fallbackTimer);
      setSession(initialSession);
      if (initialSession) {
        loadUserData(initialSession.user.id);
      } else {
        setIsAppLoading(false);
      }
    }).catch(err => {
      clearTimeout(fallbackTimer);
      console.error("Session get failed:", err);
      setIsAppLoading(false);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          loadUserData(currentSession.user.id);
        } else {
          setBusiness(null);
          setSubscription(null);
          setIsAppLoading(false);
          // If logged out, redirect to landing unless on admin page
          if (window.location.pathname === '/admin') {
            setRoute({ name: 'admin' });
          } else {
            window.location.hash = '#landing';
          }
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      authListener.unsubscribe();
    };
  }, []);

  // 4. Fetch business & subscription profiles with automatic downgrade check
  const loadUserData = async (userId: string) => {
    setIsAppLoading(true);
    try {
      // Get Business profile
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (bizError) throw bizError;
      setBusiness(bizData as Business);

      // Get Subscription profile
      const subData = await subscriptionService.getSubscription();
      
      // Auto-revoke Pro if unpaid after 1 day (current_period_end + 1 day < now)
      if (subData && subData.plan === 'pro') {
        const expiryDate = new Date(subData.current_period_end);
        const oneDayGracePeriod = new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        
        if (now > oneDayGracePeriod && subData.status !== 'active') {
          // Silent downgrade
          await supabase
            .from('subscriptions')
            .update({
              plan: 'free',
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          
          const freshSub = await subscriptionService.getSubscription();
          setSubscription(freshSub);
          triggerToast('Your Pro plan subscription has expired and has been reverted to the Free plan.', 'error');
        } else {
          setSubscription(subData);
        }
      } else {
        setSubscription(subData);
      }

    } catch (err: any) {
      console.error('Error loading user profile records:', err);
      triggerToast('Failed to retrieve business profile settings.', 'error');
    } finally {
      setIsAppLoading(false);
    }
  };

  // 5. Auth routing gate redirects
  useEffect(() => {
    if (isAppLoading) return;

    const isAuthRoute = ['landing', 'login', 'signup', 'forgot-password'].includes(route.name);
    const userEmailVal = session?.user?.email || '';
    const isAdmin = ADMIN_EMAILS.includes(userEmailVal);

    if (session) {
      // User is logged in
      if (!business) {
        // Business setup is missing -> Force Onboarding
        if (route.name !== 'onboarding') {
          window.location.hash = '#onboarding';
        }
      } else {
        // Onboarding complete
        if (isAuthRoute || route.name === 'onboarding') {
          // Prevent access to public auth pages if already logged in -> Go Dashboard
          window.location.hash = '#dashboard';
        }
        // Protect Admin Route
        if (route.name === 'admin' && !isAdmin) {
          window.location.hash = '#dashboard';
        }
      }
    } else {
      // User is NOT logged in -> Prevent dashboard access
      if (!isAuthRoute) {
        window.location.hash = '#landing';
      }
    }
  }, [route.name, session, business, isAppLoading]);

  // Navigate function passed to children
  const handleNavigate = (path: string) => {
    if (path === 'admin') {
      window.history.pushState({}, '', '/admin');
      setRoute({ name: 'admin' });
    } else {
      window.location.hash = `#${path}`;
    }
  };

  if (isAppLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}>
        <div className="btn-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'skeletonLoading 1s linear infinite',
          marginBottom: 'var(--space-md)'
        }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading BillZap...</span>
      </div>
    );
  }

  if (session && subscription?.status === 'banned') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        padding: 'var(--space-xl)',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--color-danger)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-lg)'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h1 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
          Account Suspended
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6, marginBottom: 'var(--space-xl)' }}>
          This BillZap account has been suspended by the administrator due to payment defaults or violation of terms. Please contact support to restore access.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <a 
            href="https://wa.me/923228964384" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem', color: '#09090b', fontWeight: 600 }}
          >
            Contact Support (WhatsApp)
          </a>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // Check if layout needs sidebar
  const showSidebar = session && business && !['landing', 'login', 'signup', 'forgot-password', 'onboarding', 'admin'].includes(route.name);

  // Dynamic header updates
  const getPageTitle = (): string => {
    switch (route.name) {
      case 'dashboard': return 'Dashboard';
      case 'invoices': return 'Invoices History';
      case 'invoice-create': return 'Create Invoice';
      case 'invoice-edit': return 'Edit Invoice';
      case 'invoice-detail': return 'Invoice Details';
      case 'customers': return 'Customers CRM';
      case 'customer-detail': return 'Customer Profile';
      case 'settings': return 'Settings';
      case 'billing': return 'Subscription & Billing';
      default: return '';
    }
  };

  const userEmail = session?.user?.email || '';
  const userName = session?.user?.user_metadata?.full_name || '';

  return (
    <>
      <div className={showSidebar ? 'app-container' : ''}>
        
        {showSidebar && (
          <Sidebar
            currentPath={route.name}
            userEmail={userEmail}
            userName={userName}
            onNavigate={handleNavigate}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            isAdmin={ADMIN_EMAILS.includes(userEmail)}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
          {showSidebar && (
            <Navbar
              pageTitle={getPageTitle()}
              onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onQuickInvoice={() => handleNavigate('invoice-create')}
            />
          )}

          {/* Main Router Content Wrapper */}
          <main style={{ flex: 1 }}>
            {route.name === 'landing' && <LandingPage />}
            
            {route.name === 'login' && (
              <LoginPage onToast={triggerToast} />
            )}
            
            {route.name === 'signup' && (
              <SignUpPage onToast={triggerToast} />
            )}

            {route.name === 'forgot-password' && (
              <ForgotPasswordPage onToast={triggerToast} />
            )}

            {route.name === 'onboarding' && (
              <OnboardingPage
                onToast={triggerToast}
                onOnboardingComplete={(biz) => setBusiness(biz)}
              />
            )}

            {route.name === 'dashboard' && business && (
              <DashboardPage
                business={business}
                userName={userName}
                onToast={triggerToast}
                onNavigate={handleNavigate}
                plan={subscription?.plan || 'free'}
              />
            )}

            {route.name === 'invoices' && business && (
              <InvoicesPage
                business={business}
                onToast={triggerToast}
                plan={subscription?.plan || 'free'}
              />
            )}

            {route.name === 'invoice-create' && business && (
              <InvoiceForm
                business={business}
                plan={subscription?.plan || 'free'}
                onToast={triggerToast}
                onNavigate={handleNavigate}
              />
            )}

            {route.name === 'invoice-edit' && business && (
              <InvoiceForm
                business={business}
                plan={subscription?.plan || 'free'}
                invoiceId={route.id}
                onToast={triggerToast}
                onNavigate={handleNavigate}
              />
            )}

            {route.name === 'invoice-detail' && business && (
              <InvoiceDetailPage
                invoiceId={route.id}
                business={business}
                plan={subscription?.plan || 'free'}
                onToast={triggerToast}
              />
            )}

            {route.name === 'customers' && business && (
              <CustomersPage
                business={business}
                onToast={triggerToast}
              />
            )}

            {route.name === 'customer-detail' && business && (
              <CustomerDetailPage
                customerId={route.id}
                business={business}
                onToast={triggerToast}
              />
            )}

            {route.name === 'settings' && business && (
              <SettingsPage
                business={business}
                userName={userName || userEmail}
                onBusinessUpdate={(updated) => setBusiness(updated)}
                onToast={triggerToast}
              />
            )}

            {route.name === 'billing' && business && subscription && (
              <BillingPage
                business={business}
                subscription={subscription}
                onSubscriptionUpdate={(updated) => setSubscription(updated)}
                onToast={triggerToast}
              />
            )}

            {route.name === 'admin' && (
              <AdminPage onToast={triggerToast} session={session} />
            )}
          </main>
        </div>

      </div>

      {/* Global Toast Render stack */}
      <div className="toast-container no-print">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`toast ${t.type === 'error' ? 'toast-error' : 'toast-success'}`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
