import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  UserPlus, 
  FileText
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { customerService } from '../../services/customerService';
import { subscriptionService } from '../../services/subscriptionService';
import { referralService } from '../../services/referralService';
import { calculateInvoiceTotals, validateInvoiceForm } from '../../lib/validation/invoice';
import { Customer, Business, InvoiceItem, Invoice } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { InvoicePreview } from './InvoicePreview';

interface InvoiceFormProps {
  business: Business;
  plan: 'free' | 'pro';
  invoiceId?: string; // Passed if in Edit Mode
  onToast: (msg: string, type: 'success' | 'error') => void;
  onNavigate: (path: string) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  business,
  plan,
  invoiceId,
  onToast,
  onNavigate,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Custom snapshot customer states (for walk-in or manual adjustments)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Invoice parameters
  const [status, setStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [notes, setNotes] = useState('Thank you for your business!');
  const [discount, setDiscount] = useState<number>(0);
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'invoice_id'>[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add customer modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [isAddingCust, setIsAddingCust] = useState(false);

  // Existing invoice cache (for edit mode title/prefix checks)
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  // Load customer dropdown options
  const loadCustomersData = async (selectIdAfterLoad?: string) => {
    try {
      const data = await customerService.getCustomers();
      setCustomers(data);
      if (selectIdAfterLoad) {
        setSelectedCustomerId(selectIdAfterLoad);
        const added = data.find(c => c.id === selectIdAfterLoad);
        if (added) {
          setCustomerName(added.name);
          setCustomerPhone(added.phone || '');
          setCustomerEmail(added.email || '');
        }
      }
    } catch (err) {
      console.error(err);
      onToast('Failed to load customers dropdown.', 'error');
    }
  };

  // Fetch invoice details if in edit mode
  useEffect(() => {
    async function loadFormContext() {
      setIsLoading(true);
      await loadCustomersData();

      if (invoiceId) {
        try {
          const inv = await invoiceService.getInvoiceById(invoiceId);
          if (inv) {
            setExistingInvoice(inv);
            setSelectedCustomerId(inv.customer_id || '');
            setCustomerName(inv.customer_name || '');
            setCustomerPhone(inv.customer_phone || '');
            setCustomerEmail(inv.customer_email || '');
            setStatus(inv.status);
            setNotes(inv.notes || '');
            setDiscount(inv.discount);
            setItems(inv.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
          } else {
            onToast('Invoice not found.', 'error');
            window.location.hash = '#invoices';
          }
        } catch (err: any) {
          onToast('Failed to retrieve invoice details.', 'error');
        }
      }
      setIsLoading(false);
    }
    loadFormContext();
  }, [invoiceId]);

  // Handle customer selection changes
  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (id === '') {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    } else {
      const selected = customers.find(c => c.id === id);
      if (selected) {
        setCustomerName(selected.name);
        setCustomerPhone(selected.phone || '');
        setCustomerEmail(selected.email || '');
      }
    }
  };

  // Manage row item inputs
  const handleItemChange = (index: number, key: string, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (key === 'quantity') {
      item.quantity = parseInt(value) || 0;
      item.total = Math.max(0, item.quantity * item.unit_price);
    } else if (key === 'unit_price') {
      item.unit_price = parseFloat(value) || 0;
      item.total = Math.max(0, item.quantity * item.unit_price);
    } else {
      // Description update
      (item as any)[key] = value;
    }

    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      onToast('An invoice must have at least one line item.', 'error');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Add customer inline
  const handleAddCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      onToast('Customer name is required.', 'error');
      return;
    }

    setIsAddingCust(true);
    try {
      const newCust = await customerService.createCustomer(newCustName, newCustPhone, newCustEmail);
      onToast('Customer added successfully.', 'success');
      setIsCustomerModalOpen(false);
      
      // Reload customer dropdown and automatically select the new customer
      await loadCustomersData(newCust.id);

      // Clean form inputs
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
    } catch (err: any) {
      onToast(err.message || 'Failed to create customer.', 'error');
    } finally {
      setIsAddingCust(false);
    }
  };

  // Compute Totals
  const { subtotal, total } = calculateInvoiceTotals(items, discount);

  // Submit Invoice
  const handleSaveInvoice = async () => {
    // 1. Validation checks
    const formErrors = validateInvoiceForm({
      customerName,
      items: items.map(i => ({ ...i, description: i.description || '' })),
      discount,
    });

    if (formErrors.length > 0) {
      onToast(formErrors[0].message, 'error');
      return;
    }

    // 2. Limit Check (Only on Create mode for Free plan users)
    if (!invoiceId && plan === 'free') {
      const currentMonthCount = await invoiceService.getInvoicesCountThisMonth();
      const allowed = subscriptionService.canCreateInvoice('free', currentMonthCount);
      if (!allowed) {
        onToast("You've reached your monthly free invoice limit (10). Please upgrade to Pro.", 'error');
        window.location.hash = '#billing';
        return;
      }
    }

    setIsSaving(true);
    try {
      const invoiceData = {
        customer_id: selectedCustomerId || null,
        status,
        notes: notes || undefined,
        discount,
        items,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        customer_email: customerEmail || undefined,
      };

      let resultInvoice;
      if (invoiceId) {
        resultInvoice = await invoiceService.updateInvoice(invoiceId, invoiceData);
        onToast('Invoice saved successfully.', 'success');
      } else {
        resultInvoice = await invoiceService.createInvoice(invoiceData);
        onToast('Invoice created successfully.', 'success');
        
        // Notify referral service for qualification check
        referralService.notifyInvoiceCreated().catch(err => console.error('Referral check error:', err));
      }

      // Navigate to detailed view
      window.location.hash = `#invoice-detail?id=${resultInvoice.id}`;
    } catch (err: any) {
      console.error(err);
      onToast(err.message || 'Failed to save invoice.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <div className="skeleton" style={{ width: '80px', height: '2rem' }} />
        </div>
        <div className="invoice-grid">
          <div className="skeleton" style={{ height: '400px' }} />
          <div className="skeleton" style={{ height: '400px' }} />
        </div>
      </div>
    );
  }

  const selectOptions = [
    { value: '', label: 'Select or Create Customer...' },
    ...customers.map(c => ({ value: c.id, label: c.name }))
  ];

  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  return (
    <div className="main-content">
      
      {/* Back link */}
      <button 
        onClick={() => window.location.hash = '#invoices'}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px', 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          marginBottom: 'var(--space-lg)'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Invoices</span>
      </button>

      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
          {invoiceId ? `Edit Invoice ${existingInvoice?.invoice_number || ''}` : 'Create Invoice'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Fill in the client and items below to construct your invoice.
        </p>
      </div>

      <div className="invoice-grid">
        
        {/* Editor Side */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* Customer Dropdown with inline add icon */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Select
                label="Customer *"
                options={selectOptions}
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
              />
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setIsCustomerModalOpen(true)}
              style={{ height: '42px', padding: '0 12px', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Add Customer Account Inline"
              type="button"
            >
              <UserPlus size={16} />
              <span className="no-print">New</span>
            </button>
          </div>

          {/* Snapshotted customer info fields (hidden if not selected, or editable override) */}
          {customerName && (
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--space-sm)' 
            }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase' }}>
                Billed To Profile Details:
              </h4>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{customerName}</p>
              {customerPhone && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone: {customerPhone}</p>}
              {customerEmail && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email: {customerEmail}</p>}
            </div>
          )}

          {/* Invoice status and notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <Select
              label="Status"
              options={[
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Paid', label: 'Paid' },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            />
            
            <div className="form-group">
              <label className="form-label">Discount ({currencySymbol})</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={discount === 0 ? '' : discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Items lines block */}
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)', fontFamily: 'var(--font-heading)' }}>
              Invoice Items
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {items.map((item, idx) => (
                <div key={idx} className="invoice-item-row">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Item description (e.g. Premium T-Shirt)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  />
                  <div className="invoice-item-row-sub">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Qty"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Price"
                      value={item.unit_price === 0 ? '' : item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                    />
                    <div className="invoice-item-total">
                      {currencySymbol} {item.total.toLocaleString()}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="invoice-item-delete"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-outline"
              onClick={handleAddItem}
              style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add Item Line</span>
            </button>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes & Terms</label>
            <textarea
              className="form-control"
              placeholder="Thank you for your business!"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Save Action */}
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={handleSaveInvoice}
              isLoading={isSaving}
              icon={<Save size={16} />}
              style={{ width: '100%' }}
            >
              Save Invoice & Generate PDF
            </Button>
          </div>

        </div>

        {/* Live Preview Side */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-md)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Live Print Preview
          </h3>
          <InvoicePreview
            business={business}
            plan={plan}
            customerName={customerName}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            items={items}
            subtotal={subtotal}
            discount={discount}
            total={total}
            status={status}
            notes={notes}
            invoiceNumber={existingInvoice?.invoice_number || `${business.invoice_prefix}${(business.last_invoice_number + 1).toString().padStart(4, '0')}`}
            invoiceDate={existingInvoice ? new Date(existingInvoice.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
          />
        </div>

      </div>

      {/* Inline Add Customer Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Add Customer Profile"
      >
        <form onSubmit={handleAddCustomerInline}>
          <Input
            label="Customer Name *"
            type="text"
            placeholder="Ahmed Khan"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Phone Number"
            type="text"
            placeholder="03001234567"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="ahmed@gmail.com"
            value={newCustEmail}
            onChange={(e) => setNewCustEmail(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomerModalOpen(false)}
              disabled={isAddingCust}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isAddingCust}
            >
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
