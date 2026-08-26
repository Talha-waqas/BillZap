import React, { useState } from 'react';
import { 
  Zap, 
  ArrowRight, 
  Smartphone, 
  FileText, 
  Send, 
  CheckCircle,
  Database,
  Lock,
  Plus,
  Trash2
} from 'lucide-react';
import { calculateInvoiceTotals } from '../../lib/validation/invoice';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export const LandingPage: React.FC = () => {
  // Live interactive preview calculator state
  const [demoItems, setDemoItems] = useState([
    { description: 'Premium Hoodie', quantity: 2, unit_price: 3500 },
    { description: 'Classic Cap', quantity: 1, unit_price: 1200 },
  ]);
  const [demoDiscount, setDemoDiscount] = useState(500);

  const handleAddDemoItem = () => {
    setDemoItems([...demoItems, { description: 'T-Shirt', quantity: 1, unit_price: 1500 }]);
  };

  const handleUpdateItem = (index: number, key: string, value: any) => {
    const updated = [...demoItems];
    updated[index] = { ...updated[index], [key]: value };
    setDemoItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setDemoItems(demoItems.filter((_, i) => i !== index));
  };

  const { subtotal, total } = calculateInvoiceTotals(demoItems, demoDiscount);

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      
      {/* Landing Navbar */}
      <nav className="landing-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', color: 'var(--color-primary)' }}>
          <Zap size={24} fill="var(--color-primary)" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.4rem' }}>BillZap</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pricing</a>
          <a href="#faq" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>FAQ</a>
          <button 
            className="btn btn-outline" 
            onClick={() => window.location.hash = '#login'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Log In
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.hash = '#signup'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {!isSupabaseConfigured && (
        <div style={{
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          padding: 'var(--space-sm) var(--space-xl)',
          fontSize: '0.85rem',
          textAlign: 'center',
          marginTop: '70px',
          position: 'relative',
          zIndex: 999
        }}>
          ⚠️ <strong>Configuration Required:</strong> Supabase credentials are missing. Please rename <code>.env.example</code> to <code>.env</code> at the root of the project and fill in your Supabase keys.
        </div>
      )}

      {/* Hero Section */}
      <section className="landing-hero" id="hero">
        <span className="landing-badge">Fast & Mobile-First</span>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
          fontFamily: 'var(--font-heading)', 
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: 'var(--space-md)'
        }}>
          Create. Download. <span style={{ color: 'var(--color-primary)' }}>Send.</span>
        </h1>
        <p style={{ 
          fontSize: 'clamp(1rem, 2vw, 1.25rem)', 
          color: 'var(--text-secondary)',
          maxWidth: '650px',
          margin: '0 auto var(--space-xl) auto',
          lineHeight: 1.5
        }}>
          Professional invoices made for businesses that sell through WhatsApp. Design, download, and send clean PDF receipts to your customers in under 30 seconds.
        </p>
        <div className="landing-hero-actions" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.hash = '#signup'}
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}
          >
            <span>Create Your First Invoice</span>
            <ArrowRight size={18} />
          </button>
          <a href="#demo" className="btn btn-outline" style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}>
            Try Live Demo
          </a>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ 
          textAlign: 'center', 
          fontFamily: 'var(--font-heading)', 
          fontSize: '2rem',
          marginBottom: '3rem'
        }}>
          Send Invoices in 3 Easy Steps
        </h2>
        <div className="landing-grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
          
          <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-round)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 auto var(--space-md) auto'
            }}>
              01
            </div>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Create</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Add customer details and list products or services. Totals calculate instantly.
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-round)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 auto var(--space-md) auto'
            }}>
              02
            </div>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Generate</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              We compile your information into a clean, professional print-ready PDF invoice.
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-round)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 auto var(--space-md) auto'
            }}>
              03
            </div>
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Send</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Share directly to your customer's WhatsApp with a single pre-filled message block.
            </p>
          </div>

        </div>
      </section>

      {/* Interactive Mockup Calculator Section */}
      <section className="landing-section" id="demo" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="landing-grid-2">
          
          <div>
            <span className="landing-badge">Interactive Demo</span>
            <h2 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-md)' }}>
              Try it yourself. Calculate live.
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
              Add items, quantities, prices, and discounts. Watch the subtotal and grand total update automatically. BillZap eliminates calculation errors and builds trust with your clients.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <CheckCircle size={16} className="feature-icon-wrapper" style={{ margin: 0 }} />
                <span>Zero configuration required to test</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <CheckCircle size={16} className="feature-icon-wrapper" style={{ margin: 0 }} />
                <span>Real-time calculation engine</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <CheckCircle size={16} className="feature-icon-wrapper" style={{ margin: 0 }} />
                <span>Designed for small screens and quick taps</span>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.hash = '#signup'}
              style={{ marginTop: 'var(--space-xl)' }}
            >
              Sign Up For Unlimited Invoices
            </button>
          </div>

          {/* Calculator UI Mockup Container */}
          <div className="card" style={{ padding: 'var(--space-md)', overflowX: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DEMO EDITOR</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>NØRTH Clothing</span>
            </div>

            {/* List items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {demoItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={item.description}
                    onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                    style={{ flex: 2, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    placeholder="Description"
                  />
                  <input 
                    type="number" 
                    className="form-control" 
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    style={{ width: '50px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    placeholder="Qty"
                  />
                  <input 
                    type="number" 
                    className="form-control" 
                    value={item.unit_price}
                    onChange={(e) => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    style={{ width: '90px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    placeholder="Price"
                  />
                  <span style={{ fontSize: '0.8rem', width: '70px', textAlign: 'right', fontWeight: 500 }}>
                    Rs. {(item.quantity * item.unit_price).toLocaleString()}
                  </span>
                  <button 
                    onClick={() => handleRemoveItem(idx)}
                    style={{ background: 'transparent', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-outline" 
              onClick={handleAddDemoItem}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)' }}
            >
              <Plus size={12} />
              <span>Add Item</span>
            </button>

            {/* Discount and Summary info */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Discount (Rs.)</span>
                <input 
                  type="number" 
                  className="form-control" 
                  value={demoDiscount}
                  onChange={(e) => setDemoDiscount(parseFloat(e.target.value) || 0)}
                  style={{ width: '100px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', textAlign: 'right' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2xs)' }}>
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-xs)' }}>
                <span>Grand Total</span>
                <span style={{ color: 'var(--color-primary)' }}>Rs. {total.toLocaleString()}</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Features List Section */}
      <section className="landing-section" id="features" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
          Built For Speed and Professionalism
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto var(--space-xl) auto' }}>
          Everything you need to send invoices and build credibility with customers.
        </p>

        <div className="landing-features-grid">
          
          <div className="feature-box">
            <Smartphone className="feature-icon-wrapper" size={24} />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Mobile-First Design</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Create and manage invoices on your phone. Perfect for retail or home sellers on the move.
            </p>
          </div>

          <div className="feature-box">
            <FileText className="feature-icon-wrapper" size={24} />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Professional PDF Generator</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Generate structured, beautiful PDF invoices complete with logo, terms, and distinct details.
            </p>
          </div>

          <div className="feature-box">
            <Send className="feature-icon-wrapper" size={24} />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>WhatsApp Sharing Link</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Directly deep-links into WhatsApp chat with formatted receipts, requiring no complex API configuration.
            </p>
          </div>

          <div className="feature-box">
            <Database className="feature-icon-wrapper" size={24} />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Customer Records</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Save customer details, view outstanding lists, and track billing history securely.
            </p>
          </div>

          <div className="feature-box">
            <Lock className="feature-icon-wrapper" size={24} />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Row Level Security</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your financial records are strictly protected. Other users can never read or query your data.
            </p>
          </div>

          <div className="feature-box">
            <Zap className="feature-icon-wrapper" size={24} fill="var(--color-primary)" />
            <h3 style={{ marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>Custom Business Branding</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Add your logo, configure custom invoice prefixes, set local currencies, and footer notes.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section className="landing-section" id="pricing" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
          Simple, Predictable Plans
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto var(--space-xl) auto' }}>
          Start for free, upgrade to unlock custom branding and unlimited creation.
        </p>

        <div className="pricing-grid">
          
          {/* Free plan */}
          <div className="pricing-card">
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>Free Plan</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Rs. 0</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>/month</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', minHeight: '40px' }}>
              Perfect for getting started and testing BillZap with your customers.
            </p>

            <ul className="pricing-features-list">
              <li><CheckCircle size={14} /> <span>10 invoices per month</span></li>
              <li><CheckCircle size={14} /> <span>Basic PDF generation</span></li>
              <li><CheckCircle size={14} /> <span>WhatsApp Click-to-Chat sharing</span></li>
              <li><CheckCircle size={14} /> <span>Invoices history logs</span></li>
            </ul>

            <button 
              className="btn btn-outline" 
              onClick={() => window.location.hash = '#signup'}
              style={{ marginTop: 'auto', width: '100%' }}
            >
              Sign Up Free
            </button>
          </div>

          {/* Pro plan */}
          <div className="pricing-card premium">
            <span className="pricing-tag">RECOMMENDED</span>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>Pro Plan</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Rs. 499</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>/month</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', minHeight: '40px' }}>
              Best for active freelancers, home-based brands, and small retailers.
            </p>

            <ul className="pricing-features-list">
              <li><CheckCircle size={14} /> <strong>Unlimited invoices</strong></li>
              <li><CheckCircle size={14} /> <span>Custom logo on invoices</span></li>
              <li><CheckCircle size={14} /> <span>Professional clean PDF style</span></li>
              <li><CheckCircle size={14} /> <span>Remove "BillZap" footer branding</span></li>
              <li><CheckCircle size={14} /> <span>Customer purchase history</span></li>
            </ul>

            <button 
              className="btn btn-primary" 
              onClick={() => window.location.hash = '#signup'}
              style={{ marginTop: 'auto', width: '100%' }}
            >
              Go Pro Now
            </button>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="landing-section" id="faq" style={{ borderTop: '1px solid var(--border-color)', paddingBottom: '7rem' }}>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '3rem' }}>
          Frequently Asked Questions
        </h2>
        
        <div className="faq-list">
          {[
            {
              q: 'What is WhatsApp Invoice Maker?',
              a: 'WhatsApp Invoice Maker (BillZap) is a lightweight Micro-SaaS tool built for small business owners and freelancers. It lets you create structured invoices, download them as PDF files, and open WhatsApp with pre-filled details to quickly text them to customers.'
            },
            {
              q: 'Can I automatically attach the PDF in WhatsApp using the link?',
              a: 'No. Standard web browsers cannot attach custom locally-generated files directly to a WhatsApp deep-link. BillZap automatically downloads the PDF to your phone or computer, and then opens your customer\'s WhatsApp chat with a pre-filled professional receipt message. You simply tap attach and upload the downloaded PDF file.'
            },
            {
              q: 'What currencies are supported?',
              a: 'BillZap supports PKR (Pakistani Rupee) by default, and can be customized to show and print other currencies based on your business preferences.'
            },
            {
              q: 'Is there a free tier limit?',
              a: 'Yes. The Free plan includes up to 10 invoices per calendar month. To create unlimited invoices and add your custom business logo, you can upgrade to the Pro plan for just Rs. 499/month.'
            },
            {
              q: 'Do I need accounting experience to use it?',
              a: 'Not at all! BillZap is intentionally minimal. It does not use complicated debit/credit ledger sheets. It focuses entirely on creating a professional receipt quickly.'
            }
          ].map((faq, index) => (
            <div key={index} className="faq-item">
              <button 
                onClick={() => toggleFaq(index)}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  background: 'transparent', 
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span className="faq-question">{faq.q}</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                  {activeFaq === index ? '−' : '+'}
                </span>
              </button>
              {activeFaq === index && (
                <p className="faq-answer" style={{ marginTop: 'var(--space-xs)', lineHeight: 1.5 }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Box */}
      <section style={{ backgroundColor: '#121214', borderTop: '1px solid var(--border-color)', padding: '5rem 2rem' }}>
        <div className="cta-box">
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-xs)' }}>
            Start sending better invoices today.
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Upgrade your customer billing and save hours of manual calculations.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.hash = '#signup'}
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p>&copy; {new Date().getFullYear()} BillZap. All rights reserved. Built for modern retail sellers.</p>
      </footer>

    </div>
  );
};
