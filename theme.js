// theme.js
document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('themeSelect');
  const styleSheet = document.getElementById('styleSheet');

  if (!themeSelect || !styleSheet) return; // Avoid errors if elements are missing

  const themes = {
    dark: '/styles/style-dark.css',
    light: '/styles/style-light.css',
    pastel: '/styles/style-pastel.css',
    purple: '/styles/style-purple.css',
    blue: '/styles/style-blue.css',
    orange: '/styles/style-orange.css',
    green: '/styles/style-green.css'
  };

  function applyTheme(theme) {
    styleSheet.href = themes[theme] || '/styles/style.css';
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && themes[savedTheme]) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }

  themeSelect.addEventListener('change', () => {
    const selectedTheme = themeSelect.value;
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  });
});
