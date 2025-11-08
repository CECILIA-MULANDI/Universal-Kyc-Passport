import './StatusBadge.css';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot"></span>
      {label}
    </span>
  );
}

