/* PWA: registrar solo en navegador web, nunca dentro de Capacitor. */
(function () {
  const nativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!nativeApp && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.info('PWA no disponible:', error));
    });
  }
})();
