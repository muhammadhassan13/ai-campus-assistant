import React, { useEffect, useState } from 'react';
import type { Theme } from './theme';
import {
  IconDocuments,
  IconChat,
  IconBrain,
  IconScan,
  IconSun,
  IconMoon,
  IconLogout,
  IconPrism,
  IconChevronDown,
} from './icons';

export type NavPage = 1 | 2 | 3 | 4;

interface SidebarProps {
  theme: Theme;
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  documentCount: number;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

interface NavItem {
  id: NavPage;
  label: string;
  Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  badge?: number;
}

const SIDEBAR_STORAGE_KEY = 'ui_sidebar_expanded';
const ANIM_MS = 220;
const RAIL_WIDTH = 68; // collapsed width
const EXPANDED_WIDTH = 236;
const OUTER_PAD = 12; // padding on the <aside>
const SLOT = 36; // single unified icon slot used by brand, nav, footer

function readStoredExpanded(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

export default function Sidebar({
  theme,
  activePage,
  onNavigate,
  documentCount,
  onToggleTheme,
  onSignOut,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<boolean>(readStoredExpanded);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded));
    } catch {
      // ignore
    }
  }, [expanded]);

  const items: NavItem[] = [
    { id: 1, label: 'Documents', Icon: IconDocuments, badge: documentCount },
    { id: 2, label: 'General Chat', Icon: IconChat },
    { id: 3, label: 'RAG & Voice', Icon: IconBrain },
    { id: 4, label: 'Visual Inspector', Icon: IconScan },
  ];

  const isDark = theme.name === 'deep-space';
  const width = expanded ? EXPANDED_WIDTH : RAIL_WIDTH;

  // Padding that puts the 36px slot at the visual center of the rail.
  // aside has OUTER_PAD on each side, so content width = width - 2*OUTER_PAD.
  const contentWidth = width - OUTER_PAD * 2;
  const collapsedRowPad = Math.max(0, (contentWidth - SLOT) / 2);

  // Labels: GPU-only transitions, no layout thrash.
  const labelStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    opacity: expanded ? 1 : 0,
    transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
    transition: `opacity ${ANIM_MS}ms ${theme.ease}, transform ${ANIM_MS}ms ${theme.ease}, margin-left ${ANIM_MS}ms ${theme.ease}`,
    pointerEvents: expanded ? 'auto' : 'none',
    minWidth: 0,
    flex: 1,
    marginLeft: expanded ? 10 : 0,
  };

  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    borderRadius: theme.radiusSm,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 13,
    fontFamily: theme.fontSans,
    position: 'relative',
    boxSizing: 'border-box',
    paddingLeft: expanded ? 4 : collapsedRowPad,
    paddingRight: expanded ? 12 : collapsedRowPad,
    transition: `background ${ANIM_MS}ms ${theme.ease}, color ${ANIM_MS}ms ${theme.ease}, padding-left ${ANIM_MS}ms ${theme.ease}, padding-right ${ANIM_MS}ms ${theme.ease}`,
  };

  const slotStyle: React.CSSProperties = {
    width: SLOT,
    height: SLOT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  };

  // Brand row uses the exact same padding math as nav/footer → all slots align.
  const brandRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 40,
    paddingLeft: expanded ? 4 : collapsedRowPad,
    paddingRight: expanded ? 12 : collapsedRowPad,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottom: `1px solid ${theme.separator}`,
    transition: `padding-left ${ANIM_MS}ms ${theme.ease}, padding-right ${ANIM_MS}ms ${theme.ease}`,
    boxSizing: 'border-box',
  };

  const footerRowStyle = (): React.CSSProperties => ({
    ...rowBase,
    color: theme.textSecondary,
    background: 'transparent',
    fontWeight: 500,
    fontSize: 12,
  });

  return (
    <aside
      style={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: OUTER_PAD,
        background: theme.glassBase,
        border: `1px solid ${theme.glassBorder}`,
        borderRadius: theme.radiusXl,
        boxShadow: theme.glassShadowStrong,
        fontFamily: theme.fontSans,
        overflow: 'hidden',
        transition: `width ${ANIM_MS}ms ${theme.ease}`,
        flexShrink: 0,
        boxSizing: 'border-box',
        willChange: 'width',
      }}
    >
      {/* Brand */}
      <div style={brandRowStyle}>
        <div style={slotStyle}>
          <div
            style={{
              width: SLOT,
              height: SLOT,
              borderRadius: 11,
              background: theme.accentGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${theme.accentSoft}`,
              flexShrink: 0,
            }}
          >
            <IconPrism size={20} color="#FFFFFF" strokeWidth={1.7} />
          </div>
        </div>
        <div
          style={{
            ...labelStyle,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.textPrimary,
              letterSpacing: '-0.2px',
              lineHeight: 1.15,
            }}
          >
            Lumen
          </div>
          <div
            style={{
              fontSize: 10,
              color: theme.textTertiary,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: 1,
            }}
          >
            Assist
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
          paddingTop: 12,
          overflow: 'hidden',
        }}
      >
        {items.map((item) => {
          const isActive = activePage === item.id;
          const IconCmp = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={!expanded ? item.label : undefined}
              style={{
                ...rowBase,
                background: isActive ? theme.accentSoft : 'transparent',
                color: isActive ? theme.accent : theme.textSecondary,
                fontWeight: isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={slotStyle}>
                <IconCmp
                  size={18}
                  color={isActive ? theme.accent : theme.textSecondary}
                  strokeWidth={1.9}
                />
                {!expanded && item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 6,
                      background: theme.accent,
                      color: '#FFFFFF',
                      minWidth: 16,
                      textAlign: 'center',
                      lineHeight: 1.3,
                      boxShadow: `0 2px 6px ${theme.accentSoft}`,
                      pointerEvents: 'none',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
              <span style={labelStyle}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    opacity: expanded ? 1 : 0,
                    transition: `opacity ${ANIM_MS}ms ${theme.ease}`,
                    flexShrink: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: expanded ? '2px 6px' : 0,
                    borderRadius: 6,
                    background: isActive
                      ? theme.accent
                      : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(60,60,67,0.08)',
                    color: isActive ? '#FFFFFF' : theme.textSecondary,
                    minWidth: expanded ? 18 : 0,
                    textAlign: 'center',
                    marginLeft: expanded ? 6 : 0,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingTop: 12,
          borderTop: `1px solid ${theme.separator}`,
        }}
      >
        <button
          onClick={onToggleTheme}
          title={
            !expanded ? (isDark ? 'Liquid Glass' : 'Deep Space') : undefined
          }
          style={footerRowStyle()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={slotStyle}>
            {isDark ? (
              <IconSun size={18} color={theme.textSecondary} />
            ) : (
              <IconMoon size={18} color={theme.textSecondary} />
            )}
          </span>
          <span style={labelStyle}>
            {isDark ? 'Liquid Glass' : 'Deep Space'}
          </span>
        </button>

        <button
          onClick={onSignOut}
          title={!expanded ? 'Sign Out' : undefined}
          style={footerRowStyle()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.dangerSoft;
            e.currentTarget.style.color = theme.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          <span style={slotStyle}>
            <IconLogout size={18} color="currentColor" />
          </span>
          <span style={labelStyle}>Sign Out</span>
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={footerRowStyle()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={slotStyle}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)',
                transition: `transform ${ANIM_MS}ms ${theme.ease}`,
              }}
            >
              <IconChevronDown size={18} color={theme.textSecondary} />
            </span>
          </span>
          <span style={labelStyle}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
