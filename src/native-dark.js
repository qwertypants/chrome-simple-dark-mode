// Sample visible surfaces, with a fixed cap independent of document size.
export function sampleNativeTheme(doc = document) {
  const win = doc.defaultView;
  const luminance = color => {
    const n = color.match(/[\d.]+/g)?.map(Number);
    if (!n || n.length < 3 || n[3] === 0) return null;
    return (0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]) / 255;
  };
  const effective = element => {
    let value = 0, remaining = 1;
    for (let depth = 0; element && depth < 24; depth++, element = element.parentElement || element.getRootNode()?.host) {
      const color = win.getComputedStyle(element).backgroundColor;
      const channels = color.match(/[\d.]+/g)?.map(Number);
      const alpha = channels?.length >= 3 ? (channels[3] ?? 1) : 0;
      value += (luminance(color) ?? 0) * alpha * remaining;
      remaining *= 1 - alpha;
      if (remaining === 0) break;
    }
    return value + remaining;
  };
  const roots = new Set();
  let dark = 0, light = 0, samples = 0;
  const width = win.innerWidth, height = win.innerHeight;
  for (const y of [.2, .4, .6, .8, .95]) for (const x of [.1, .3, .5, .7, .9]) {
    let element = doc.elementFromPoint(width * x, height * y);
    if (!element) continue;
    // Open roots can hide the actual surface behind a transparent host.
    for (let depth = 0; element.shadowRoot && depth < 4; depth++) {
      roots.add(element.shadowRoot);
      const inner = element.shadowRoot.elementFromPoint(width * x, height * y);
      if (!inner || inner === element) break;
      element = inner;
    }
    if (['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'SVG'].includes(element.tagName)) continue;
    const background = effective(element);
    const foreground = luminance(win.getComputedStyle(element).color);
    samples++;
    if (background < .3 && foreground !== null && foreground > .5) dark++;
    else if (background > .65) light++;
  }
  return {theme: samples >= 5 && dark / samples >= .7 ? 'dark' : samples >= 5 && light / samples >= .5 ? 'light' : 'uncertain', samples, roots: [...roots]};
}
