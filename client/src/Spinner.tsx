interface SpinnerProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Spinner({
  size = 14,
  color = 'currentColor',
  strokeWidth = 2,
}: SpinnerProps) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ animation: 'cgSpin 0.8s linear infinite', flexShrink: 0 }}
      >
        <path d="M12 3a9 9 0 1 0 9 9" opacity="0.9" />
      </svg>
      <style>{`@keyframes cgSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
