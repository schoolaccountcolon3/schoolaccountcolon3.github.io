// theme.js
document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration ---
  const themesJsonPath = '/themes.json'; // Path to your themes JSON file
  const defaultTheme = 'dark';          // The theme to apply if none is saved
  const styleSwitcherContainerId = 'styleSwitcher'; // The ID for the UI container

  /**
   * Applies a theme to the document by setting CSS variables.
   * This function requires the full theme data object to work.
   *
   * @param {string} themeName - The name of the theme to apply (e.g., 'dark').
   * @param {object} allThemes - The object containing all theme definitions.
   */
  function applyTheme(themeName, allThemes) {
    console.log(`Applying theme: ${themeName}`);
    
    // First, create a set of all possible variable names to clear previous themes
    const allVarNames = new Set();
    Object.values(allThemes).forEach(theme => {
      Object.keys(theme).forEach(varName => allVarNames.add(varName));
    });
    const customTheme = JSON.parse(localStorage.getItem('customTheme') || '{}');
    Object.keys(customTheme).forEach(varName => allVarNames.add(varName));

    // Remove all possible properties to ensure a clean slate
    allVarNames.forEach(name => document.documentElement.style.removeProperty(`--${name}`));

    // Apply the new theme's variables
    const themeData = themeName === 'custom'
      ? JSON.parse(localStorage.getItem('customTheme') || '{}')
      : allThemes[themeName];
    if (themeData) {
      Object.entries(themeData).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
      setThemedFavicon(themeData);
    }
  }

  /**
   * Builds the interactive theme picker UI.
   *
   * @param {HTMLElement} container - The element to build the UI in.
   * @param {string} currentThemeName - The currently active theme name.
   * @param {object} allThemes - The object containing all theme definitions.
   */
  function buildPickerUI(container, currentThemeName, allThemes) {
    console.log("Container found. Building theme picker UI.");
    container.innerHTML = ''; // Clear container

    const label = document.createElement('label');
    label.htmlFor = 'themeSelect';
    label.textContent = 'Theme:';

    const themeSelect = document.createElement('select');
    themeSelect.id = 'themeSelect';

    // Populate dropdown
    Object.keys(allThemes).forEach(themeName => {
      const option = document.createElement('option');
      option.value = themeName;
      option.textContent = formatThemeName(themeName);
      themeSelect.appendChild(option);
    });

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom Theme';
    themeSelect.appendChild(customOption);

    const configLink = document.createElement('a');
    configLink.href = '/theme-config.html';
    configLink.textContent = 'Configure Custom Theme';
    configLink.style.marginLeft = '10px';
    configLink.style.color = 'var(--color-link)';
    configLink.style.textDecoration = 'none';

    container.append(label, themeSelect, configLink);

    themeSelect.value = currentThemeName;

    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      localStorage.setItem('theme', selectedTheme);
      applyTheme(selectedTheme, allThemes);
    });
  }

  function formatThemeName(name) {
    return name
      .split(/[-_]/) // split on dash or underscore
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Loads favicon.svg, replaces colors, and sets as favicon.
   * @param {object} theme - The current theme object.
   */
  async function setThemedFavicon(theme) {
    // Fetch the SVG as text
    const resp = await fetch('/favicon.svg');
    let svg = await resp.text();

    // Replace #FF0000 (red) with primary color, #000 (black) with bg
    svg = svg
      .replace(/#FF0000/gi, theme['color-primary'] || '#FFFFFF')
      .replace(/#00FF00/gi, theme['color-primary-hover'] || '#FFFFFF')
      .replace(/#fff/gi, theme['color-card-bg'] || '#FFFFFF');

    // Encode as data URL
    const url = 'data:image/svg+xml;base64,' + btoa(svg);

    // Set as favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  /**
   * Main function to fetch data and initialize the theme system.
   */
  async function initializeThemeSystem() {
    console.log("Theme system initializing...");
    try {
      const response = await fetch(themesJsonPath);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const allThemes = await response.json();
      console.log("Themes loaded successfully.");

      // Determine which theme to apply
      const savedTheme = localStorage.getItem('theme');
      const themeToApply = (savedTheme && (allThemes[savedTheme] || savedTheme === 'custom'))
                           ? savedTheme
                           : defaultTheme;

      // ALWAYS apply the theme now that we have the data
      applyTheme(themeToApply, allThemes);

      // CONDITIONALLY build the UI
      const container = document.getElementById(styleSwitcherContainerId);
      if (container) {
        buildPickerUI(container, themeToApply, allThemes);
      } else {
        console.log("UI container not found. Skipping picker creation.");
      }
    } catch (error) {
      console.error('Error initializing theme system:', error);
    }
  }

  // Start the process
  initializeThemeSystem();
});