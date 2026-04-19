(() => {
  const root = document.documentElement;
  const storageKey = 'cannabis-done-right-theme';
  const button = document.querySelector('[data-theme-toggle]');
  const label = button?.querySelector('[data-theme-label]');
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch (_error) {
    savedTheme = null;
  }

  const initialTheme = savedTheme || 'dark';
  root.dataset.theme = initialTheme === 'light' ? 'light' : 'dark';

  const syncButton = () => {
    if (!button) return;
    const isDark = root.dataset.theme !== 'light';
    button.setAttribute('aria-pressed', String(!isDark));
    button.title = isDark ? 'Switch to a lighter paper theme' : 'Switch to the darker night theme';
    if (label) {
      label.textContent = isDark ? 'Paper' : 'Night';
    }
  };

  syncButton();

  button?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(storageKey, root.dataset.theme);
    } catch (_error) {
      // localStorage can be unavailable in privacy-restricted contexts.
    }
    syncButton();
  });

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!revealItems.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }
})();
