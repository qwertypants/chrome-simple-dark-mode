import {enableTheme, disableTheme} from './theme.js';
import {sampleNativeTheme} from './native-dark.js';
let enabled = false;
let rendered = false;
let status = 'off';
let observer;
let timer;
const colorScheme = matchMedia('(prefers-color-scheme: dark)');
const owned = node => (node.nodeType === 1 ? node : node.parentElement)?.closest?.('.darkreader');
function stopObservation() {
  observer?.disconnect();
  clearTimeout(timer);
  timer = undefined;
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
    if (records.some(relevantMutation)) scheduleEvaluation();
  });
  const options = {subtree: true, childList: true, attributes: true, characterData: true};
  observer.observe(document.documentElement, options);
  for (const root of result.roots) observer.observe(root, options);
}
const primarySurface = element => element?.matches?.('html, body, main, [role="main"], style, link[rel="stylesheet"]');
function relevantMutation(record) {
  if (owned(record.target)) return false;
  const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
  if (record.type === 'attributes') {
    if (record.attributeName.startsWith('data-darkreader')) return false;
    return /theme|scheme|color-mode/.test(record.attributeName) || ['class', 'style'].includes(record.attributeName) || primarySurface(element);
  }
  if (record.type === 'characterData') return element?.tagName === 'STYLE';
  if (element?.tagName === 'STYLE') return true;
  // The renderer already handles ordinary text, cards and feed updates. Recheck
  // native appearance for primary content replacement or new stylesheet signals.
  const meaningful = node => node.nodeType === 1 && !owned(node) && (primarySurface(element) || primarySurface(node));
  return Array.prototype.some.call(record.addedNodes, meaningful) || Array.prototype.some.call(record.removedNodes, meaningful);
}
function scheduleEvaluation() {
  if (!enabled || timer !== undefined) return;
  // A fixed deadline cannot be postponed by a busy page's later mutations.
  timer = setTimeout(() => { timer = undefined; evaluate(); }, 120);
}
const themeChange = scheduleEvaluation;
export function applyEnabled(next) {
  next = next === true && document.contentType !== 'application/pdf';
  if (next === enabled) return;
  enabled = next;
  if (next) {
    evaluate();
    addEventListener('popstate', themeChange);
    addEventListener('hashchange', themeChange);
    addEventListener('load', themeChange, true);
    colorScheme.addEventListener('change', themeChange);
  } else {
    stopObservation();
    removeEventListener('popstate', themeChange);
    removeEventListener('hashchange', themeChange);
    removeEventListener('load', themeChange, true);
    colorScheme.removeEventListener('change', themeChange);
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
