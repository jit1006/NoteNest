// Apply the saved theme before first paint (external file so a strict Content-Security-Policy can forbid inline scripts).
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('notenest:theme:v1'));
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
