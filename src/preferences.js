export async function getEnabled(hostname, storage = chrome.storage.local) {
  const key = `site:${hostname}`;
  return (await storage.get(key))[key] === true;
}
export async function setEnabled(hostname, enabled, storage = chrome.storage.local) {
  await storage.set({[`site:${hostname}`]: enabled === true});
}
