interface TagChipProps {
  value: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary';
}

export function TagChip({ value, onRemove, variant = 'default' }: TagChipProps) {
  const baseClasses = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors";
  const variantClasses = variant === 'primary' 
    ? "bg-blue-100 text-blue-800 border border-blue-200"
    : "bg-gray-100 text-gray-800 border border-gray-200";

  return (
    <span className={`${baseClasses} ${variantClasses}`}>
      {value}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${value}`}
          type="button"
        >
          <svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </span>
  );
}
