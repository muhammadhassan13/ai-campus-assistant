import { useEffect, useRef, useState } from 'react';

interface ThemeFadeProps {
  trigger: string;
}

export default function ThemeFade({ trigger }: ThemeFadeProps) {
  const [opacity, setOpacity] = useState(0);
  const [rendered, setRendered] = useState(false);
  const lastTriggerRef = useRef(trigger);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;

    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    timersRef.current.push(
      window.setTimeout(() => {
        setRendered(true);
        setOpacity(0.28);
      }, 0),
      window.setTimeout(() => setOpacity(0), 55),
      window.setTimeout(() => setRendered(false), 140)
    );

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [trigger]);

  if (!rendered) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'rgba(200, 205, 215, 0.85)',
        opacity,
        transition: 'opacity 60ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}
