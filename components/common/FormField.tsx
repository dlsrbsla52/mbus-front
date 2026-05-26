import type { ReactNode } from 'react';

interface FormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, hint, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-brand-black">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-brand-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
}

export const TextInput = ({ invalid, className = '', ...rest }: TextInputProps) => (
  <input
    {...rest}
    className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-brand-black placeholder:text-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
      invalid ? 'border-danger' : 'border-brand-gray-200'
    } ${className}`}
  />
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = ({ invalid, className = '', ...rest }: TextareaProps) => (
  <textarea
    {...rest}
    className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-brand-black placeholder:text-brand-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
      invalid ? 'border-danger' : 'border-brand-gray-200'
    } ${className}`}
  />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = ({ invalid, className = '', children, ...rest }: SelectProps) => (
  <select
    {...rest}
    className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-blue ${
      invalid ? 'border-danger' : 'border-brand-gray-200'
    } ${className}`}
  >
    {children}
  </select>
);
