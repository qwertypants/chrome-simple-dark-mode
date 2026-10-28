import {classifySite} from './site.js';
import {getEnabled, setEnabled} from './preferences.js';
// Registration and permission changes share one queue, including startup recovery.
let pending = Promise.resolve();
function serialize(work) {
  const result = pending.then(work);
  pending = result.catch(() => {});
  return result;
}
const registrationId = hostname => `site-${Array.from(hostname, c => c.codePointAt(0).toString(16)).join('-')}`;
async function permitted(site) {
  return chrome.permissions.contains({origins: [site.originPattern]});
}
async function updateTabs(site, enabled) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter(tab => !enabled || classifySite(tab.url).hostname === site.hostname).map(async tab => {
    if (enabled) {
      try { await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']}); } catch { return; }
    }
    try { await chrome.tabs.sendMessage(tab.id, {type: 'site:apply', hostname: site.hostname, enabled}); } catch { /* Closed or protected tabs have no receiver. */ }
  }));
}
async function reconcileSite(site) {
  let enabled = await getEnabled(site.hostname);
  if (enabled && !await permitted(site)) {
    await setEnabled(site.hostname, false);
    enabled = false;
  }
  const id = registrationId(site.hostname);
  const registered = (await chrome.scripting.getRegisteredContentScripts({ids: [id]})).length > 0;
  if (enabled && !registered) await chrome.scripting.registerContentScripts([{id, matches: [site.originPattern], js: ['content.js'], runAt: 'document_idle', world: 'ISOLATED', persistAcrossSessions: true}]);
  if (!enabled && registered) await chrome.scripting.unregisterContentScripts({ids: [id]});
  await updateTabs(site, enabled);
  return enabled;
}
async function reconcile() {
  const values = await chrome.storage.local.get(null);
  const sites = new Map();
  for (const key of Object.keys(values)) {
    if (!key.startsWith('site:')) continue;
    const site = classifySite(`https://${key.slice(5)}/`);
    if (site.supported) sites.set(site.hostname, site);
  }
  // Remove orphan registrations as well as disabled/revoked ones.
  for (const script of await chrome.scripting.getRegisteredContentScripts()) {
    if (!script.id.startsWith('site-')) continue;
    const site = classifySite(script.matches[0].replace('*://', 'https://'));
    if (site.supported) sites.set(site.hostname, site);
  }
  for (const site of sites.values()) await reconcileSite(site);
}
async function handle(message, sender) {
  // Content scripts can only read their own state. Mutations belong to extension UI.
  const fromContent = Boolean(sender.tab) && !sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`);
  if (fromContent && message.type !== 'site:state') throw Error('Only the extension control can change a site.');
  const tab = fromContent ? {...sender.tab, url: sender.url || sender.tab.url} : await chrome.tabs.get(message.tabId);
  const site = classifySite(tab.url);
  if (!site.supported) return {...site, enabled: false};
  if (message.type === 'site:set') {
    if (typeof message.enabled !== 'boolean') throw Error('Choose on or off.');
    if (message.hostname !== site.hostname) throw Error('The tab changed websites. Reopen the control.');
    if (message.enabled && !await permitted(site)) {
      await setEnabled(site.hostname, false);
      await reconcileSite(site);
      return {...site, enabled: false, accessNeeded: true, error: 'Site access was not granted. Try again.'};
    }
    await setEnabled(site.hostname, message.enabled);
    await reconcileSite(site);
  }
  const saved = await getEnabled(site.hostname);
  const access = await permitted(site);
  if (saved && !access) await reconcileSite(site);
  if (access && !fromContent) {
    try {
      await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content.js']});
      const delivery = await chrome.tabs.sendMessage(tab.id, {type: 'site:apply', hostname: site.hostname, enabled: saved});
      if (delivery?.enabled !== saved || delivery?.renderable === false) throw Error('The page did not confirm the update.');
    } catch {
      return {...site, enabled: false, savedEnabled: saved, accessNeeded: false, renderable: false,
        error: 'Chrome could not change this page. PDF viewers and protected pages are not supported.'};
    }
  }
  return {...site, enabled: saved && access, savedEnabled: saved && access, accessNeeded: !access, renderable: saved && access ? true : undefined};
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['site:state', 'site:set'].includes(message?.type)) return;
  serialize(() => handle(message, sender)).then(respond, error => respond({enabled: false, error: error.message}));
  return true;
});
const recover = () => { serialize(reconcile).catch(console.error); };
chrome.runtime.onInstalled.addListener(recover);
chrome.runtime.onStartup.addListener(recover);
chrome.permissions.onAdded.addListener(recover);
chrome.permissions.onRemoved.addListener(recover);
// Runs on every worker wake, so recovery never relies on a previous worker instance.
recover();
