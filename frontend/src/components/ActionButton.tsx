import './ActionButton.css';

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function ActionButton({
  onClick,
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`action-btn action-btn-${variant} ${loading ? 'loading' : ''}`}
    >
      {loading ? (
        <>
          <span className="btn-spinner"></span>
          Processing...
        </>
      ) : (
        <>
          {icon && <span className="btn-icon">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );
}

