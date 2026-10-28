import {enableTheme, disableTheme} from './theme.js';
let enabled = false;
export function applyEnabled(next) {
  next = next === true && document.contentType !== 'application/pdf';
  if (next === enabled) return;
  enabled = next;
  next ? enableTheme() : disableTheme();
}
if (!globalThis.__simpleDarkMode) {
  globalThis.__simpleDarkMode = true;
  let revision = 0;
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message.type !== 'site:apply' || message.hostname !== location.hostname) return;
    revision++;
    applyEnabled(message.enabled);
    respond({enabled, renderable: document.contentType !== 'application/pdf'});
  });
  const initialRevision = revision;
  // Dark Reader's API wrapper forwards callbacks but drops Promise return values.
  chrome.runtime.sendMessage({type: 'site:state'}, state => {
    if (chrome.runtime.lastError) return;
    if (revision === initialRevision) applyEnabled(state?.enabled);
  });
}
