import { Fzf } from 'fzf';

// Initialize search when the page loads
window.initializeSearch = function(bookmarks) {
  let selectedIndex = -1;
  let filteredBookmarks = [];
  let fzf = null;

  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results-container');

  // Initialize fzf with bookmarks
  fzf = new Fzf(bookmarks, {
    selector: (item) => item.name + ' ' + (item.display || ''),
    tiebreakers: [(a, b) => a.item.name.length - b.item.name.length]
  });

  function renderResults(results) {
    if (results.length === 0 && searchInput.value) {
      resultsContainer.innerHTML = '<div class="no-results">No matches found</div>';
      resultsContainer.style.display = 'block';
      return;
    }
    
    if (!searchInput.value) {
      resultsContainer.style.display = 'none';
      return;
    }
    
    const html = results.map((result, index) => {
      const bookmark = result.item;
      const selected = index === selectedIndex ? 'selected' : '';
      const displayName = bookmark.display && bookmark.display !== bookmark.name ? 
        bookmark.name + ' (' + bookmark.display + ')' : bookmark.name;
      return '<div class="result-item ' + selected + '" data-index="' + index + '" data-url="' + bookmark.url + '">' +
        '<span class="result-name">' + displayName + '</span>' +
      '</div>';
    }).join('');
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
    
    // Add click handlers
    document.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        window.location.href = item.dataset.url;
      });
    });
  }

  function updateSelection() {
    const items = document.querySelectorAll('.result-item');
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (!query) {
      filteredBookmarks = [];
      resultsContainer.style.display = 'none';
      return;
    }
    
    const results = fzf.find(query);
    filteredBookmarks = results;
    selectedIndex = results.length > 0 ? 0 : -1;
    renderResults(results);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIndex < filteredBookmarks.length - 1) {
        selectedIndex++;
        updateSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) {
        selectedIndex--;
        updateSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredBookmarks.length) {
        window.location.href = filteredBookmarks[selectedIndex].item.url;
      }
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      resultsContainer.style.display = 'none';
      selectedIndex = -1;
    }
  });

  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      resultsContainer.style.display = 'none';
    }
  });

  // Show all bookmarks on focus if empty
  searchInput.addEventListener('focus', () => {
    if (!searchInput.value) {
      const results = bookmarks.map(item => ({ item, score: 0 }));
      filteredBookmarks = results;
      selectedIndex = 0;
      renderResults(results);
    }
  });

  // Auto-focus the search input on page load
  searchInput.focus();
};

