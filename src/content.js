import {enableTheme, disableTheme} from './theme.js';
import {sampleNativeTheme} from './native-dark.js';
let enabled = false;
let rendered = false;
let status = 'off';
let observer;
let timer;
const owned = node => (node.nodeType === 1 ? node : node.parentElement)?.closest?.('.darkreader');
function stopObservation() {
  observer?.disconnect();
  clearTimeout(timer);
}
function evaluate() {
  stopObservation();
  if (!enabled) return;
  // Always inspect original styles, never the engine's transformed output.
  if (rendered) disableTheme();
  rendered = false;
  const result = sampleNativeTheme();
  status = result.theme === 'dark' ? 'already-dark' : 'on';
  if (result.theme !== 'dark') {
    enableTheme();
    rendered = true;
  }
  observer ||= new MutationObserver(records => {
    if (!records.some(record => !owned(record.target) && (record.type !== 'childList' || Array.prototype.some.call(record.addedNodes, node => !owned(node)) || Array.prototype.some.call(record.removedNodes, node => !owned(node))))) return;
    clearTimeout(timer);
    timer = setTimeout(evaluate, 120);
  });
  const options = {subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode', 'href', 'media'], characterData: true};
  observer.observe(document.documentElement, options);
  for (const root of result.roots) observer.observe(root, options);
}
const themeChange = () => {
  if (!enabled) return;
  clearTimeout(timer);
  timer = setTimeout(evaluate, 120);
};
export function applyEnabled(next) {
  next = next === true && document.contentType !== 'application/pdf';
  if (next === enabled) return;
  enabled = next;
  if (next) {
    evaluate();
    addEventListener('popstate', themeChange);
    addEventListener('hashchange', themeChange);
    addEventListener('load', themeChange, true);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChange);
  } else {
    stopObservation();
    removeEventListener('popstate', themeChange);
    removeEventListener('hashchange', themeChange);
    removeEventListener('load', themeChange, true);
    matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', themeChange);
    if (rendered) disableTheme();
    rendered = false;
    status = 'off';
  }
}
if (!globalThis.__simpleDarkMode) {
  globalThis.__simpleDarkMode = true;
  let revision = 0;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== 'site:apply' || message.hostname !== location.hostname) return;
    revision++;
    applyEnabled(message.enabled);
    respond({enabled, status, renderable: document.contentType !== 'application/pdf'});
  });
  const initialRevision = revision;
  chrome.runtime.sendMessage({type: 'site:state'}, state => {
    if (chrome.runtime.lastError) return;
    if (revision === initialRevision) applyEnabled(state?.enabled);
  });
}
