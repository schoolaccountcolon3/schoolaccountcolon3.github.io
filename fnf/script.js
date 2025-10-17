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

function createProxiedURL(originalUrl, proxyDomain = 'https://0hgmbni0.space.stayinschooleducation.org.cdn.cloudflare.net') {
    const encoded = encodeUltravioletURL(originalUrl);
    return `${proxyDomain}/@/space/${encoded}`;
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
            link.href = createProxiedURL(mod.iframeLink);
            link.textContent = mod.modName;
            link.target = '_blank';

            item.appendChild(image);
            item.appendChild(link);
            modsGrid.appendChild(item);

            imageObserver.observe(image);
        });
    };

    async function loadCSV() {
        try {
            const response = await fetch('fnf_mods_combined.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvData = await response.text();

            const rows = csvData.trim().split('\n').slice(1);
            allMods = rows.map(row => {
                const columns = row.split(',');
                return {
                    modName: columns[0],
                    iframeLink: columns[1],
                    imageUrl: columns[2]
                };
            }).filter(mod => mod.modName);

            displayMods(allMods);
        } catch (error) {
            console.error('Error loading or parsing the CSV file:', error);
            modsGrid.innerHTML = `<p class="error">Failed to load mod data. Please check the console.</p>`;
        }
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