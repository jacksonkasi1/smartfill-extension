// ** import constants
import { overlayThemeCss } from '@/styles/tokens'

export const OVERLAY_CSS = `
:host { all: initial; }
${overlayThemeCss}
.sf-root {
  all: initial;
  color-scheme: light;
  position: fixed; inset: 0; pointer-events: none;
  font-family: var(--font-family);
  font-size: var(--font-body); line-height: 20px; letter-spacing: normal; color: var(--sf-text);
  -webkit-font-smoothing: antialiased;
  --sf-primary: var(--primary); --sf-primary-hover: var(--primary-hover); --sf-soft: var(--primary-soft);
  --sf-success: var(--success); --sf-success-soft: color-mix(in srgb, var(--success) 12%, transparent); --sf-warning: var(--warning);
  --sf-bg: var(--bg); --sf-border: var(--border); --sf-text: var(--text);
  --sf-muted: var(--muted-foreground); --sf-surface: var(--surface); --sf-shadow: var(--shadow-popover);
}
.sf-root *, .sf-root *::before, .sf-root *::after { box-sizing: border-box; font: inherit; color: inherit; letter-spacing: inherit; }
.sf-root button {
  all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: var(--control-height); padding: 0 12px; border: 1px solid var(--sf-border); border-radius: var(--radius-control); cursor: pointer; font-weight: 500; font-size: var(--font-body);
  background: var(--sf-bg); color: var(--sf-text); white-space: nowrap; transition: background 0.15s, border-color 0.15s, opacity 0.15s;
}
.sf-root button:hover:not(:disabled) { background: var(--sf-surface); border-color: var(--border-strong); }
.sf-root button:focus-visible { outline: 2px solid var(--sf-primary); outline-offset: 2px; }
.sf-root button.sf-primary { background: var(--sf-primary); border-color: var(--sf-primary); border-radius: var(--radius-pill); color: var(--primary-text); }
.sf-root button.sf-primary:hover:not(:disabled) { background: var(--sf-primary-hover); border-color: var(--sf-primary-hover); }
.sf-root button:disabled { opacity: 0.45; cursor: default; }
.sf-root button.sf-link { padding: 0 8px; border-color: transparent; background: transparent; color: var(--sf-primary); }
.sf-root button.sf-icon { width: 32px; min-height: 32px; height: 32px; padding: 0; border-color: transparent; background: transparent; color: var(--sf-muted); }
.sf-root button.sf-icon:hover { background: var(--sf-surface); color: var(--sf-text); }

.sf-card {
  pointer-events: auto; background: var(--sf-bg); border: 1px solid var(--sf-border); border-radius: var(--radius);
  box-shadow: var(--sf-shadow);
}
.sf-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--sf-primary); }
.sf-muted { color: var(--sf-muted); }

/* ---- picker ---- */
.sf-capture { position: fixed; inset: 0; pointer-events: auto; cursor: crosshair; background: transparent; }
.sf-toolbar {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  width: max-content; max-width: calc(100vw - 32px);
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 12px 16px;
}
.sf-toolbar-copy { display: flex; flex-direction: column; min-width: 0; }
.sf-toolbar-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
.sf-toolbar-hint { font-size: var(--font-small); line-height: 18px; color: var(--sf-muted); }
.sf-count { font-weight: 500; font-size: var(--font-small); color: var(--sf-primary); background: var(--sf-soft); padding: 4px 8px; border-radius: var(--radius-pill); white-space: nowrap; }
.sf-count.sf-zero { color: var(--sf-muted); background: var(--sf-surface); }
.sf-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.sf-box { position: fixed; pointer-events: none; border-radius: 6px; }
.sf-hover { border: 2px solid var(--sf-primary); background: color-mix(in srgb, var(--sf-primary) 8%, transparent); }
.sf-container { border: 2px dashed var(--sf-primary); background: color-mix(in srgb, var(--sf-primary) 4%, transparent); }
.sf-field { border: 2px solid var(--sf-primary); background: color-mix(in srgb, var(--sf-primary) 10%, transparent); border-radius: 4px; }
.sf-field.sf-success { border-color: var(--sf-success); background: var(--sf-success-soft); }
.sf-badge {
  position: absolute; top: -8px; right: -8px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--sf-primary); color: var(--primary-text); font-size: 10px; line-height: 16px; text-align: center; font-weight: 600;
}
.sf-tag {
  position: absolute; left: -2px; top: -22px; max-width: 280px; padding: 2px 8px; border-radius: 6px 6px 6px 0;
  background: var(--sf-primary); color: var(--primary-text); font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sf-tag.sf-below { top: auto; bottom: -22px; border-radius: 0 6px 6px 6px; }
.sf-band { position: fixed; pointer-events: none; border: 2px solid var(--sf-primary); background: color-mix(in srgb, var(--sf-primary) 12%, transparent); border-radius: 4px; }
.sf-band.sf-remove { border-color: var(--error); background: color-mix(in srgb, var(--error) 10%, transparent); }

/* ---- page panel ---- */
.sf-panel {
  position: fixed; right: 16px; bottom: 16px; width: 360px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px); overflow: auto;
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
  animation: sf-in 0.18s ease-out;
}
.sf-panel-head { display: flex; align-items: center; gap: 8px; }
.sf-panel-title { flex: 1; min-width: 0; font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.sf-panel-msg { color: var(--sf-muted); font-size: 13px; overflow-wrap: anywhere; }
.sf-panel.sf-tone-success .sf-dot { background: var(--sf-success); }
.sf-panel.sf-tone-warning .sf-dot { background: var(--sf-warning); }
.sf-spinner {
  width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent;
  animation: sf-spin 0.7s linear infinite;
}
.sf-flash { animation: sf-flash 1.2s ease-out forwards; }
@keyframes sf-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes sf-spin { to { transform: rotate(360deg); } }
@keyframes sf-flash { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .sf-panel, .sf-flash, .sf-spinner { animation-duration: 0.01s; } }
`

