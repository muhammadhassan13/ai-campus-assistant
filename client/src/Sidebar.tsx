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
  IconSparkle,
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
const ANIM_MS = 200;

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
  const width = expanded ? 240 : 72;

  const labelStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    opacity: expanded ? 1 : 0,
    maxWidth: expanded ? 200 : 0,
    transition: `opacity 140ms ${theme.ease}, max-width ${ANIM_MS}ms ${theme.ease}`,
    pointerEvents: expanded ? 'auto' : 'none',
  };

  return (
    <aside
      style={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: expanded ? 16 : 12,
        background: theme.glassBase,
        border: `1px solid ${theme.glassBorder}`,
        borderRadius: theme.radiusXl,
        boxShadow: theme.glassShadowStrong,
        fontFamily: theme.fontSans,
        overflow: 'hidden',
        transition: `width ${ANIM_MS}ms ${theme.ease}, padding ${ANIM_MS}ms ${theme.ease}`,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: expanded ? '8px 8px 16px 8px' : '8px 0 16px 0',
          borderBottom: `1px solid ${theme.separator}`,
          justifyContent: expanded ? 'flex-start' : 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: theme.accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${theme.accentSoft}`,
            flexShrink: 0,
          }}
        >
          <IconSparkle size={18} color="#FFFFFF" strokeWidth={2.2} />
        </div>
        <div
          style={{
            ...labelStyle,
            flex: expanded ? 1 : 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.textPrimary,
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
            }}
          >
            Campus.AI
          </div>
          <div
            style={{
              fontSize: 10,
              color: theme.textTertiary,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Workspace
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
                display: 'flex',
                alignItems: 'center',
                gap: expanded ? 12 : 0,
                padding: expanded ? '10px 12px' : '10px 0',
                borderRadius: theme.radiusSm,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: isActive ? theme.accentSoft : 'transparent',
                color: isActive ? theme.accent : theme.textSecondary,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: theme.fontSans,
                transition: `background 160ms ${theme.ease}, color 160ms ${theme.ease}, padding ${ANIM_MS}ms ${theme.ease}, gap ${ANIM_MS}ms ${theme.ease}`,
                justifyContent: expanded ? 'flex-start' : 'center',
                position: 'relative',
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
              <IconCmp
                size={18}
                color={isActive ? theme.accent : theme.textSecondary}
                strokeWidth={1.9}
              />
              <span
                style={{
                  ...labelStyle,
                  flex: expanded ? 1 : 0,
                  minWidth: 0,
                }}
              >
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    ...labelStyle,
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
                  }}
                >
                  {item.badge}
                </span>
              )}
              {!expanded && item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 10,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 6,
                    background: theme.accent,
                    color: '#FFFFFF',
                    minWidth: 16,
                    textAlign: 'center',
                    lineHeight: 1.3,
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
          style={footerButtonStyle(theme, isDark, expanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {isDark ? (
            <IconSun size={18} color={theme.textSecondary} />
          ) : (
            <IconMoon size={18} color={theme.textSecondary} />
          )}
          <span
            style={{
              ...labelStyle,
              flex: expanded ? 1 : 0,
              minWidth: 0,
              textAlign: 'left',
            }}
          >
            {isDark ? 'Liquid Glass' : 'Deep Space'}
          </span>
        </button>

        <button
          onClick={onSignOut}
          title={!expanded ? 'Sign Out' : undefined}
          style={footerButtonStyle(theme, isDark, expanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.dangerSoft;
            e.currentTarget.style.color = theme.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          <IconLogout size={18} color="currentColor" />
          <span
            style={{
              ...labelStyle,
              flex: expanded ? 1 : 0,
              minWidth: 0,
            }}
          >
            Sign Out
          </span>
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={footerButtonStyle(theme, isDark, expanded)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)',
              transition: `transform ${ANIM_MS}ms ${theme.ease}`,
              flexShrink: 0,
            }}
          >
            <IconChevronDown size={18} color={theme.textSecondary} />
          </span>
          <span
            style={{
              ...labelStyle,
              flex: expanded ? 1 : 0,
              minWidth: 0,
              textAlign: 'left',
            }}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}

function footerButtonStyle(
  theme: Theme,
  _isDark: boolean,
  expanded: boolean
): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: expanded ? 12 : 0,
    padding: expanded ? '10px 12px' : '10px 0',
    borderRadius: theme.radiusSm,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: theme.fontSans,
    transition: `background 160ms ${theme.ease}, color 160ms ${theme.ease}, padding ${ANIM_MS}ms ${theme.ease}, gap ${ANIM_MS}ms ${theme.ease}`,
    justifyContent: expanded ? 'flex-start' : 'center',
  };
}
