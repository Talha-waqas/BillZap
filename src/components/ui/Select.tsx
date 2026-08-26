import React from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`form-control ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: '#121214' }}>
            {opt.label}
          </option>
        ))}
      </select>
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
