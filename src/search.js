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
    
    if (results.length === 0) {
      resultsContainer.style.display = 'none';
      return;
    }
    
    // Sort results by original index to maintain tree order
    const sortedResults = results.slice().sort((a, b) => {
      const indexA = a.item.index !== undefined ? a.item.index : 0;
      const indexB = b.item.index !== undefined ? b.item.index : 0;
      return indexA - indexB;
    });
    
    const html = sortedResults.map((result, index) => {
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
    
    // Highlight the selected item in the tree
    updateTreeHighlight();
  }
  
  function updateTreeHighlight() {
    const treeItems = document.querySelectorAll('.tree-item');
    treeItems.forEach(item => item.classList.remove('selected'));
    
    if (selectedIndex >= 0 && selectedIndex < filteredBookmarks.length) {
      const selectedUrl = filteredBookmarks[selectedIndex].item.url;
      const matchingTreeItem = Array.from(treeItems).find(treeItem => {
        const link = treeItem.querySelector('a');
        return link && link.href === selectedUrl;
      });
      if (matchingTreeItem) {
        matchingTreeItem.classList.add('selected');
      }
    }
  }

  function updateSelection() {
    const items = document.querySelectorAll('.result-item');
    const treeItems = document.querySelectorAll('.tree-item');
    
    // Clear all tree highlights
    treeItems.forEach(item => item.classList.remove('selected'));
    
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
        
        // Highlight the corresponding tree item
        const url = item.dataset.url;
        const matchingTreeItem = Array.from(treeItems).find(treeItem => {
          const link = treeItem.querySelector('a');
          return link && link.href === url;
        });
        if (matchingTreeItem) {
          matchingTreeItem.classList.add('selected');
        }
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function filterTreeVisualization(query) {
    const treeItems = document.querySelectorAll('.tree-item');
    const treeCategories = document.querySelectorAll('.tree-category');
    const columns = document.querySelectorAll('.column');
    
    if (!query) {
      // Show all items
      treeItems.forEach(item => item.classList.remove('hidden'));
      treeCategories.forEach(cat => cat.classList.remove('hidden'));
      columns.forEach(col => col.classList.remove('hidden'));
      return;
    }
    
    // Find matching bookmarks
    const results = fzf.find(query);
    const matchingPaths = new Set(results.map(r => r.item.name));
    
    // Hide/show tree items based on matches
    treeItems.forEach(item => {
      const path = item.dataset.path;
      const display = item.dataset.display || '';
      
      // Check if this item matches
      const isMatch = Array.from(matchingPaths).some(matchPath => 
        matchPath === path || matchPath.endsWith('/' + display)
      );
      
      if (isMatch) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
    
    // Hide/show categories based on whether they have visible children
    treeCategories.forEach(category => {
      const ul = category.querySelector('ul');
      const visibleChildren = ul.querySelectorAll('.tree-item:not(.hidden), .tree-category:not(.hidden)');
      
      if (visibleChildren.length === 0) {
        category.classList.add('hidden');
      } else {
        category.classList.remove('hidden');
      }
    });
    
    // Hide/show columns based on whether they have any visible content
    columns.forEach(column => {
      const visibleItems = column.querySelectorAll('.tree-item:not(.hidden)');
      const visibleCategories = column.querySelectorAll('.tree-category:not(.hidden)');
      
      if (visibleItems.length === 0 && visibleCategories.length === 0) {
        column.classList.add('hidden');
      } else {
        column.classList.remove('hidden');
      }
    });
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    
    // Filter tree visualization
    filterTreeVisualization(query);
    
    if (!query) {
      // Show all bookmarks when search is empty
      const results = bookmarks.map(item => ({ item, score: 0 }));
      filteredBookmarks = results;
      selectedIndex = 0;
      renderResults(results);
      return;
    }
    
    const results = fzf.find(query);
    // Sort results by original index to maintain tree order
    const sortedResults = results.slice().sort((a, b) => {
      const indexA = a.item.index !== undefined ? a.item.index : 0;
      const indexB = b.item.index !== undefined ? b.item.index : 0;
      return indexA - indexB;
    });
    filteredBookmarks = sortedResults;
    selectedIndex = sortedResults.length > 0 ? 0 : -1;
    renderResults(sortedResults);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (selectedIndex < filteredBookmarks.length - 1) {
        selectedIndex++;
        updateSelection();
      }
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
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
  
  // Show all bookmarks on initial load (already in tree order)
  const initialResults = bookmarks.map(item => ({ item, score: 0 }));
  filteredBookmarks = initialResults;
  selectedIndex = 0;
  renderResults(initialResults);
};

