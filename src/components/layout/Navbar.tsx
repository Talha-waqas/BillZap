import React from 'react';
import { Menu, Plus, Zap } from 'lucide-react';

interface NavbarProps {
  pageTitle: string;
  onMenuToggle: () => void;
  onQuickInvoice: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  onMenuToggle,
  onQuickInvoice
}) => {
  return (
    <header className="mobile-header no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <button 
          onClick={onMenuToggle}
          style={{ 
            color: 'var(--text-primary)', 
            cursor: 'pointer',
            padding: 'var(--space-2xs)',
            background: 'transparent',
            border: 'none'
          }}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2xs)', color: 'var(--color-primary)' }}>
          <Zap size={20} fill="var(--color-primary)" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem' }}>BillZap</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <button
          className="btn btn-primary"
          onClick={onQuickInvoice}
          style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2xs)'
          }}
        >
          <Plus size={14} />
          <span>Invoice</span>
        </button>
      </div>
    </header>
  );
};
