import React, { useEffect, useRef, useCallback } from 'react';

interface ScrollableProps {
  children: React.ReactNode;
  thumbWidth?: number;
  minThumbHeight?: number;
  thumbColor?: string;
  thumbHoverColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Scrollable({
  children,
  thumbWidth = 6,
  minThumbHeight = 30,
  thumbColor = 'rgba(60, 60, 67, 0.28)',
  thumbHoverColor = 'rgba(60, 60, 67, 0.45)',
  style,
  className,
}: ScrollableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const thumbTrackRef = useRef<HTMLDivElement>(null);
  const thumbHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const updateThumb = useCallback(() => {
    const el = containerRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { scrollHeight, clientHeight, scrollTop } = el;
    const overflow = scrollHeight - clientHeight;

    if (overflow <= 1) {
      thumb.style.opacity = '0';
      thumb.style.pointerEvents = 'none';
      return;
    }

    const ratio = clientHeight / scrollHeight;
    const h = Math.max(minThumbHeight, clientHeight * ratio);
    thumbHeightRef.current = h;

    const maxTop = clientHeight - h;
    const progress = scrollTop / overflow;
    const top = progress * maxTop;

    thumb.style.opacity = '1';
    thumb.style.pointerEvents = 'auto';
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translate3d(0, ${top}px, 0)`;
  }, [minThumbHeight]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateThumb();
    });
  }, [updateThumb]);

  // Effect 1 — set up listeners & observers, run once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Immediate measure + one on the next frame (catches layout settle)
    scheduleUpdate();
    const t = window.setTimeout(scheduleUpdate, 0);

    el.addEventListener('scroll', scheduleUpdate, { passive: true });

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);

    // Observe any descendants that could change size
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(el, { childList: true, subtree: true });

    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.clearTimeout(t);
      el.removeEventListener('scroll', scheduleUpdate);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate]);

  // Effect 2 — remeasure whenever children change identity
  useEffect(() => {
    scheduleUpdate();
    const t = window.setTimeout(scheduleUpdate, 50);
    return () => window.clearTimeout(t);
  }, [children, scheduleUpdate]);

  // Drag handling
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const { scrollHeight, clientHeight } = el;
      const h = thumbHeightRef.current;
      const maxTop = clientHeight - h;
      const maxScroll = scrollHeight - clientHeight;
      if (maxTop <= 0 || maxScroll <= 0) return;

      const ratio = Math.max(0, Math.min(1, (relativeY - h / 2) / maxTop));
      el.scrollTop = ratio * maxScroll;
    };

    const onUp = () => {
      draggingRef.current = false;
      const thumb = thumbRef.current;
      if (thumb) thumb.style.cursor = 'grab';
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    const el = containerRef.current;
    const track = thumbTrackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const { scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return;
    el.scrollTop = (relativeY / rect.height) * maxScroll;
  };

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        data-scrollable="true"
        className={className}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>

      <div
        ref={thumbTrackRef}
        onMouseDown={onTrackMouseDown}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          right: 2,
          width: thumbWidth + 6,
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        <div
          ref={thumbRef}
          onMouseEnter={() => {
            const thumb = thumbRef.current;
            if (thumb && !draggingRef.current) {
              thumb.style.background = thumbHoverColor;
            }
          }}
          onMouseLeave={() => {
            const thumb = thumbRef.current;
            if (thumb && !draggingRef.current) {
              thumb.style.background = thumbColor;
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            draggingRef.current = true;
            const thumb = thumbRef.current;
            if (thumb) thumb.style.cursor = 'grabbing';
          }}
          style={{
            position: 'absolute',
            top: 0,
            right: 3,
            width: thumbWidth,
            height: 30,
            background: thumbColor,
            borderRadius: 999,
            opacity: 0,
            transition: 'background-color 140ms ease, opacity 140ms ease',
            cursor: 'grab',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}
