import { enable, disable, setFetchMethod } from 'darkreader';

// Never grant the engine a network transport, including image analysis requests.
setFetchMethod(async () => { throw new Error('Remote theme fetching is disabled'); });

export function enableTheme() {
  enable({brightness: 100, contrast: 100, sepia: 0, grayscale: 0,
    darkSchemeBackgroundColor: '#181a1b', darkSchemeTextColor: '#e8e6e3'},
  {disableStyleSheetsProxy: true, css: `:focus-visible { outline: 3px solid #ffffff !important; outline-offset: 3px !important; }`});
}

export function disableTheme() {
  disable();
  // API 4.9.134 leaves its empty invert sheet behind after disabling.
  const clean = root => {
    root.querySelectorAll('style.darkreader--invert').forEach(style => {
      if (!style.textContent) style.remove();
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) clean(el.shadowRoot); });
  };
  clean(document);
}
