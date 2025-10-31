function encodeUltravioletURL(url) {
    const encoded = url.split('').map((char, index) => {
        if (index % 2 === 1) {
            return String.fromCharCode(char.charCodeAt(0) ^ 2);
        } else {
            return char;
        }
    }).join('');
    return encodeURIComponent(encoded);
}

function createProxiedURL(originalUrl, proxyDomain = 'https://youcantypeanythinghere.hu.stayinschooleducation.org.cdn.cloudflare.net') {
    const encoded = encodeUltravioletURL(originalUrl);
    return `${proxyDomain}/network/service/${encoded}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const modsGrid = document.getElementById('mods-grid');
    const searchBar = document.getElementById('search-bar');
    let allMods = [];

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {

            if (entry.isIntersecting) {
                const image = entry.target;

                image.src = image.dataset.src;

                image.classList.add('loaded');

                observer.unobserve(image);
            }
        });
    }, {

        rootMargin: '200px'
    });

    const displayMods = (mods) => {
        modsGrid.innerHTML = '';
        if (mods.length === 0) {
            modsGrid.innerHTML = `<p style="color: var(--color-fg-muted);">No mods found.</p>`;
            return;
        }

        mods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'mod-item';

            const image = document.createElement('img');

            image.dataset.src = mod.imageUrl;

            image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
            image.alt = mod.modName;
            image.className = 'lazy-image'; 

            image.onerror = () => { image.src = 'placeholder.png'; };

            const link = document.createElement('a');
            // default to proxied URL; we'll store both URLs on the element for easy toggling
            link.href = createProxiedURL(mod.iframeLink);
            link.dataset.proxied = createProxiedURL(mod.iframeLink);
            link.dataset.original = mod.iframeLink;
            link.textContent = mod.modName;
            link.className = 'mod-link';
            item.appendChild(image);
            const linkContainer = document.createElement('div');
            linkContainer.appendChild(link);
            item.appendChild(linkContainer);
            modsGrid.appendChild(item);

            imageObserver.observe(image);
        });
    };

    // Robust CSV parser that handles quoted fields and escaped quotes ("")
    function parseCSV(text) {
        const rows = [];
        let cur = '';
        let row = [];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === '"') {
                // If we're in quotes and next char is also a quote, it's an escaped quote
                if (inQuotes && text[i + 1] === '"') {
                    cur += '"';
                    i++; // skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                row.push(cur);
                cur = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                // Handle CRLF and lone CR or LF
                row.push(cur);
                cur = '';
                rows.push(row);
                row = [];

                // if CRLF, skip the LF after CR
                if (ch === '\r' && text[i + 1] === '\n') {
                    i++;
                }
            } else {
                cur += ch;
            }
        }

        // push remaining
        if (cur !== '' || row.length > 0) {
            row.push(cur);
            rows.push(row);
        }

        // Trim possible BOM from first cell
        if (rows.length && rows[0].length && typeof rows[0][0] === 'string') {
            rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
        }

        return rows;
    }

    async function loadCSV() {
        try {
            const response = await fetch('fnf_mods_combined.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvData = await response.text();

            // Use robust CSV parser to handle quoted fields
            const parsed = parseCSV(csvData.trim());

            // If there is a header row, skip it. Otherwise use all rows.
            const startIndex = parsed.length > 0 && parsed[0].some(cell => /mod/i.test(cell) || /iframe/i.test(cell)) ? 1 : 0;

            allMods = parsed.slice(startIndex).map(columns => {
                // columns may be shorter; default to empty strings
                const [modName = '', iframeLink = '', imageUrl = ''] = columns;
                return {
                    modName: String(modName).trim(),
                    iframeLink: String(iframeLink).trim(),
                    imageUrl: String(imageUrl).trim()
                };
            }).filter(mod => mod.modName);

            displayMods(allMods);
        } catch (error) {
            console.error('Error loading or parsing the CSV file:', error);
            modsGrid.innerHTML = `<p class="error">Failed to load mod data. Please check the console.</p>`;
        }
    }

    // add logic for the global "original toggle" checkbox
    const originalToggle = document.getElementById('original-toggle');
    function updateLinksToOriginal(openOriginal) {
        const links = modsGrid.querySelectorAll('.mod-link');
        links.forEach(a => {
            if (openOriginal) {
                a.href = a.dataset.original || a.href;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            } else {
                a.href = a.dataset.proxied || a.href;
                a.removeAttribute('target');
                a.removeAttribute('rel');
            }
        });
    }

    if (originalToggle) {
        originalToggle.addEventListener('change', (e) => {
            updateLinksToOriginal(e.target.checked);
        });
    }

    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredMods = allMods.filter(mod => {
            return mod.modName.toLowerCase().includes(searchTerm);
        });
        displayMods(filteredMods);
    });

    loadCSV();
});