/**
 * Desktop-only presentation seam. The sidebar is rendered by the shared web
 * client, so keep Electron-specific chrome here instead of forking that UI.
 */
export const DESKTOP_UI_POLISH_STYLE = `
  :root[data-desktop-shell] {
    color-scheme: light dark;
    --desktop-sidebar-motion: 180ms;
    --desktop-sidebar-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  :root[data-desktop-shell] [data-app-sidebar] [data-sidebar="sidebar-inner"] {
    will-change: width, transform;
    transition:
      width var(--desktop-sidebar-motion) var(--desktop-sidebar-ease),
      background-color 160ms ease,
      border-color 160ms ease;
  }

  :root[data-desktop-shell] [data-app-sidebar] [data-rune-sidebar-row] {
    transition:
      opacity var(--desktop-sidebar-motion) var(--desktop-sidebar-ease),
      transform var(--desktop-sidebar-motion) var(--desktop-sidebar-ease),
      background-color 140ms ease,
      color 140ms ease;
  }

  :root[data-desktop-shell] [data-app-sidebar] [data-rune-sidebar-row]:active {
    transform: translateY(1px) scale(0.99);
  }

  :root[data-desktop-shell] [data-app-sidebar] [data-rune-sidebar-row="thread"] {
    animation: desktop-sidebar-row-in 220ms var(--desktop-sidebar-ease) both;
  }

  @keyframes desktop-sidebar-row-in {
    from { opacity: 0; transform: translateX(-6px); }
    to { opacity: 1; transform: translateX(0); }
  }

  :root[data-desktop-shell] [data-sidebar-state="collapsed"] [data-app-sidebar]
    [data-rune-sidebar-row] {
    opacity: 0;
    pointer-events: none;
  }

  :root[data-desktop-shell] [data-sidebar-state="collapsed"] [data-app-sidebar]
    [data-rune-sidebar-rail] {
    opacity: 1;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    :root[data-desktop-shell] {
      --desktop-sidebar-motion: 0ms;
    }

    :root[data-desktop-shell] [data-app-sidebar] [data-rune-sidebar-row] {
      animation: none;
      transition: none;
    }
  }
`;

export function installDesktopUiPolish(document: Document): void {
  const install = () => {
    const root = document.documentElement;
    if (!root) {
      return false;
    }

    root.dataset.desktopShell = "true";
    const style = document.createElement("style");
    style.dataset.desktopUiPolish = "true";
    style.textContent = DESKTOP_UI_POLISH_STYLE;
    (document.head ?? root).append(style);
    return true;
  };

  if (!install()) {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  }
}
