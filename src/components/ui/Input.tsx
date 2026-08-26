import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-control ${error ? 'border-danger' : ''} ${className}`}
        {...props}
      />
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
