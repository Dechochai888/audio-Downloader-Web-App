import { Loader2 } from 'lucide-react';
import classNames from 'classnames';

export function Card({ className = '', children }: any) {
  return (
    <div className={classNames('rounded-2xl bg-white/80 backdrop-blur shadow-xl p-6', className)}>
      {children}
    </div>
  );
}

export function Label({ children, htmlFor }: any) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
      {children}
    </label>
  );
}

export function Input(props: any) {
  return (
    <input
      {...props}
      className={classNames(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none',
        'focus:ring-4 focus:ring-brand-100 focus:border-brand-400',
        props.className
      )}
    />
  );
}

export function Select({ options, ...props }: any) {
  return (
    <select
      {...props}
      className={classNames(
        'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none',
        'focus:ring-4 focus:ring-brand-100 focus:border-brand-400'
      )}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Button({ children, loading, ...props }: any) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
        'bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-600/20',
        'disabled:opacity-60 disabled:cursor-not-allowed'
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
