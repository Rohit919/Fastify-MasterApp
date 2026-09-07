import type { InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className, ...props }: InputProps) {
  return (
    <label style={{ display: 'block' }}>
      {label && <span style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>{label}</span>}
      <input
        id={id}
        className={cx('admin-input', className)}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          fontSize: 14,
        }}
        {...props}
      />
    </label>
  );
}
