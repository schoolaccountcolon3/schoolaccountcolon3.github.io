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
    green: '/styles/style-green.css',
    custom: null // Custom theme doesn't use a CSS file
  };

  function clearCustomTheme() {
    // Clear all custom theme variables
    const customTheme = JSON.parse(localStorage.getItem('customTheme') || '{}');
    Object.keys(customTheme).forEach(name => {
      document.documentElement.style.removeProperty(`--${name}`);
    });
  }

  function applyTheme(theme) {
    if (theme === 'custom') {
      // Clear any existing theme CSS
      styleSheet.href = '';
      
      // Apply custom theme from localStorage
      const customTheme = JSON.parse(localStorage.getItem('customTheme') || '{}');
      Object.entries(customTheme).forEach(([name, value]) => {
        document.documentElement.style.setProperty(`--${name}`, value);
      });
    } else {
      // Clear custom theme variables first
      clearCustomTheme();
      
      // Load the theme CSS file
      styleSheet.href = themes[theme] || '/styles/style.css';
    }
  }

  // Add "Custom Theme" option to the select element if it doesn't exist
  if (!themeSelect.querySelector('option[value="custom"]')) {
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Theme';
    themeSelect.appendChild(customOption);
  }

  // Add "Configure Custom Theme" link if it doesn't exist
  if (!document.querySelector('a[href="theme-config.html"]')) {
    const configLink = document.createElement('a');
    configLink.href = '/theme-config.html';
    configLink.textContent = 'Configure Custom Theme';
    configLink.style.marginLeft = '10px';
    configLink.style.color = 'var(--color-link)';
    configLink.style.textDecoration = 'none';
    themeSelect.parentNode.appendChild(configLink);
  }

  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && (themes[savedTheme] || savedTheme === 'custom')) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }

  // Handle theme changes
  themeSelect.addEventListener('change', () => {
    const selectedTheme = themeSelect.value;
    localStorage.setItem('theme', selectedTheme);
    applyTheme(selectedTheme);
  });
});
