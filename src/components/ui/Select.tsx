import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string } }) => void;
  id?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  value,
  onChange,
  id,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find active label matching the current value
  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0];
  const displayLabel = selectedOption ? selectedOption.label : 'Select...';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string | number) => {
    if (onChange) {
      // Dispatch a simulated event payload compatible with e.target.value
      onChange({ target: { value: String(val) } } as any);
    }
    setIsOpen(false);
  };

  return (
    <div className={`form-group ${className}`} ref={dropdownRef} style={{ position: 'relative' }}>
      {label && (
        <label className="form-label" style={{ display: 'block', marginBottom: 'var(--space-2xs)' }}>
          {label}
        </label>
      )}
      
      {/* Dropdown Toggle Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`form-control ${error ? 'border-danger' : ''}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: 'rgba(9, 9, 11, 0.4)',
          border: isOpen ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
          boxShadow: isOpen ? '0 0 0 2px rgba(16, 185, 129, 0.15)' : 'none',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          minHeight: '42px',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          color: value === '' ? 'var(--text-secondary)' : '#ffffff' 
        }}>
          {displayLabel}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-muted)', 
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: '8px'
          }} 
        />
      </div>

      {/* Floating Options Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg), 0 10px 25px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          maxHeight: '220px',
          overflowY: 'auto'
        }}>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: '10px 14px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <span className="form-error" style={{
          fontSize: '0.75rem',
          color: 'var(--color-danger)',
          marginTop: 'var(--space-2xs)',
          display: 'block'
        }}>
          {error}
        </span>
      )}
    </div>
  );
};
