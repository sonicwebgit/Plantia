import React from 'react';

export const Header = () => (
  <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <a href="#/" className="flex items-center gap-2 text-2xl font-bold text-emerald-700 dark:text-emerald-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.61 3.29C17.39 3.11 17.11 3 16.82 3H12v2h4.82l-2.9 2.9C13.29 8.53 12.66 9 12 9s-1.29-.47-1.92-1.1L4.5 2.32l-1.42 1.42L8.66 9.3c.63.63 1.49 1.1 2.42 1.29V13H10v-2c0-1.65-1.35-3-3-3H5V3H3v2c0 1.65 1.35 3 3 3h1v2H5c-1.65 0-3 1.35-3 3v7h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v-7c0-1.65-1.35-3-3-3h-2v-1.42c.93-.19 1.79-.66 2.42-1.29l5.58-5.58 1.42-1.42L17.61 3.29z"/>
          </svg>
          <span>Plantia</span>
        </a>
        <div className="flex items-center gap-2">
          <a href="#/add" className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Plant
          </a>
           <a href="#/settings" title="Settings" className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
           </a>
        </div>
      </div>
    </div>
  </header>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = '' }: CardProps) => (
  <div className={`overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm ${className}`}>
    {children}
  </div>
);

export const Spinner = () => (
    <div className="flex justify-center items-center p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 dark:border-emerald-700 border-t-emerald-600 dark:border-t-emerald-400"></div>
    </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'sm';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', size = 'default', ...props }, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 dark:focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';
  
  return <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`} {...props} />;
});