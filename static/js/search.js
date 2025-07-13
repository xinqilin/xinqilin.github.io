document.addEventListener('DOMContentLoaded', function () {
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const searchTrigger = document.getElementById('search-trigger');
    const resultsContainer = document.getElementById('search-results-container');

    let searchData = null;

    async function loadSearchData() {
        if (!searchData) {
            try {
                const response = await fetch('/index.json');
                searchData = await response.json();
            } catch (error) {
                console.error('Error loading search data:', error);
            }
        }
    }

    function performSearch(query) {
        if (!query || !searchData) {
            resultsContainer.style.display = 'none';
            return;
        }

        const lowerCaseQuery = query.toLowerCase();
        const results = searchData.filter(item => {
            const title = (item.title || '').toLowerCase();
            const content = (item.content || '').toLowerCase();
            const tags = (item.tags || []).join(' ').toLowerCase();
            return title.includes(lowerCaseQuery) || content.includes(lowerCaseQuery) || tags.includes(lowerCaseQuery);
        });

        displayResults(results);
    }

    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.style.display = 'none';
            return;
        }

        const html = results.slice(0, 10).map(item => `
            <a href="${item.permalink}" class="search-result-link">
                <div class="search-result-title">${item.title}</div>
                <p class="search-result-summary">${item.content.substring(0, 80)}...</p>
            </a>
        `).join('');

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
    }

    searchTrigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        searchContainer.classList.add('search-active');
        searchInput.focus();
        loadSearchData();
    });

    searchInput.addEventListener('input', function () {
        performSearch(this.value);
    });

    document.addEventListener('click', function (e) {
        if (!searchContainer.contains(e.target)) {
            searchContainer.classList.remove('search-active');
            resultsContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});