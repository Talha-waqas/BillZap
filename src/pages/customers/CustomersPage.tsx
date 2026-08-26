import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2,
  Phone,
  Mail,
  Loader
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { Customer, Business } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface CustomersPageProps {
  business: Business;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  business,
  onToast
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Add Customer');
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
      onToast('Failed to load customers list.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setModalTitle('Add Customer');
    setActiveCustomerId(null);
    setName('');
    setPhone('');
    setEmail('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setModalTitle('Edit Customer');
    setActiveCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast('Customer name is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (activeCustomerId) {
        // Edit Mode
        await customerService.updateCustomer(activeCustomerId, { name, phone, email });
        onToast('Customer profile updated.', 'success');
      } else {
        // Create Mode
        await customerService.createCustomer(name, phone, email);
        onToast('Customer created successfully.', 'success');
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      onToast(err.message || 'Failed to save customer.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await customerService.deleteCustomer(deleteId);
      onToast('Customer profile deleted.', 'success');
      setIsDeleteOpen(false);
      loadCustomers();
    } catch (err: any) {
      onToast(err.message || 'Failed to delete customer.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <div className="skeleton" style={{ width: '180px', height: '2rem' }} />
          <div className="skeleton" style={{ width: '130px', height: '2.5rem' }} />
        </div>
        <div className="skeleton" style={{ height: '50px', marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: '350px' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage profiles and billing history for your regular customers.
          </p>
        </div>
        <Button 
          onClick={handleOpenAddModal}
          icon={<Plus size={16} />}
        >
          Add Customer
        </Button>
      </div>

      {/* Search Input */}
      <div className="form-group" style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
        <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
          <Search size={18} />
        </span>
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Customers Table Container */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredCustomers.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: 'var(--space-2xl)' }}>
            <Users size={40} className="empty-state-icon" />
            <p>{searchQuery ? 'No customers match your search.' : 'You haven\'t added any customers yet.'}</p>
            {!searchQuery && (
              <Button 
                onClick={handleOpenAddModal}
                variant="outline"
                icon={<Plus size={14} />}
              >
                Add Your First Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Phone</th>
                  <th>Contact Email</th>
                  <th>Invoices</th>
                  <th>Total Billed</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr 
                    key={c.id}
                    onClick={() => window.location.hash = `#customer-detail?id=${c.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{c.phone}</span>
                      </span>
                    ) : '—'}</td>
                    <td>{c.email ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.8rem' }}>{c.email}</span>
                      </span>
                    ) : '—'}</td>
                    <td>{c.invoice_count}</td>
                    <td>{currencySymbol} {c.total_billed?.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => window.location.hash = `#customer-detail?id=${c.id}`}
                          title="View Invoices"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon btn-danger"
                          onClick={() => handleOpenDelete(c.id)}
                          title="Delete Customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
      >
        <form onSubmit={handleSaveCustomer}>
          <Input
            label="Customer Name *"
            type="text"
            placeholder="e.g. Ahmed Khan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Phone Number"
            type="text"
            placeholder="e.g. 03001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. ahmed@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={isSaving}
            >
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Customer Profile"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Are you sure you want to delete this customer? This action will permanently remove their records. Invoices associated with this customer will remain in history, but they will be marked as linked to a deleted customer profile.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
          >
            Delete Permanently
          </Button>
        </div>
      </Modal>

    </div>
  );
};
