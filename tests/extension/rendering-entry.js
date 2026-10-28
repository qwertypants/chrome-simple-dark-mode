import { enableTheme, disableTheme } from '../../src/theme.js';
const NativeObserver = globalThis.MutationObserver;
const active = new Set();
globalThis.MutationObserver = class extends NativeObserver {
  observe(...args) { active.add(this); return super.observe(...args); }
  disconnect() { active.delete(this); return super.disconnect(); }
};
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === 'rendering-test') {
    message.enabled ? enableTheme() : disableTheme();
    respond({ok: true, activeObservers: active.size});
  }
});
