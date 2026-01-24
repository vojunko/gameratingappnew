// IGDB API credentials are loaded from environment variables via a backend proxy
// See README.md for setup instructions


// Tab and filter elements
const tabSearch = document.getElementById('tab-search');
const tabRated = document.getElementById('tab-rated');
const searchSection = document.getElementById('search-section');
const ratedSection = document.getElementById('rated-section');
const homeLink = document.getElementById('home-link');
const ratedSearch = document.getElementById('rated-search');
const filterRelease = document.getElementById('filter-release');
const filterRating = document.getElementById('filter-rating');

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const gamesList = document.getElementById('games-list');

let playedGames = JSON.parse(localStorage.getItem('playedGames') || '[]');
let ratedSearchValue = '';
let filterReleaseValue = '';
let filterRatingValue = '';
let lastSearchQuery = '';

function renderStars(rating, onClick) {
  const starContainer = document.createElement('div');
  starContainer.className = 'star-rating';
  // Render stars in reverse order to enable CSS-only "hover previews" (1..N)
  // while keeping the visual order left-to-right as 1..5.
  for (let i = 5; i >= 1; i--) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= rating ? ' filled' : '');
    star.innerHTML = '&#9733;';
    if (onClick) {
      star.style.cursor = 'pointer';
      // Use closure to capture the correct value of i
      (function(starValue) {
        star.addEventListener('click', (e) => {
          e.stopPropagation();
          onClick(starValue);
        });
      })(i);
    }
    starContainer.appendChild(star);
  }
  return starContainer;
}

async function ensureCritics() {
  const missing = playedGames.filter(g => typeof g.critic !== 'number').map(g => g.id);
  if (missing.length) {
    try {
      const res = await fetch(`/api/critics?ids=${missing.join(',')}`);
      const data = await res.json();
      const map = new Map(data.map(d => [d.id, d.critic]));
      playedGames = playedGames.map(g => ({ ...g, critic: typeof g.critic === 'number' ? g.critic : map.get(g.id) ?? null }));
      localStorage.setItem('playedGames', JSON.stringify(playedGames));
    } catch {}
  }
}

async function renderPlayedGames() {
  await ensureCritics();
  let filtered = playedGames.slice();
  if (ratedSearchValue) {
    filtered = filtered.filter(game =>
      game.name.toLowerCase().includes(ratedSearchValue.toLowerCase())
    );
  }
  if (filterReleaseValue === 'asc') {
    filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
  } else if (filterReleaseValue === 'desc') {
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  if (filterRatingValue === 'high') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (filterRatingValue === 'low') {
    filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  }
  gamesList.innerHTML = '';
  filtered.forEach((game, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${game.cover || ''}" alt="${game.name}" />
      <div class="content">
        <div class="title-row">
          <div class="title-left">
            <div class="title-main">
              <strong>${game.name}</strong>
              ${typeof game.critic === 'number' ? `<span class="critic-badge critic-inline" style="display:none;" title="Metacritic">${game.critic}%</span>` : ''}
              ${typeof game.critic === 'number' ? `<button class="expand-btn" aria-expanded="false" title="Show Metacritic">▾</button>` : ''}
            </div>
            ${game.year ? `<span class="year-under">${game.year}</span>` : ''}
          </div>
          <div class="title-right">
            <div class="rating"></div>
            <button data-idx="${idx}" class="remove-btn" title="Remove from rated games">&#10006;</button>
          </div>
        </div>
      </div>
    `;
    // Render stars
    const ratingDiv = li.querySelector('.rating');
    // Render stars on the right within the title row
    ratingDiv.appendChild(renderStars(game.rating || 0, (star) => {
      const realIdx = playedGames.findIndex(g => g.id === game.id);
      playedGames[realIdx].rating = star;
      localStorage.setItem('playedGames', JSON.stringify(playedGames));
      renderPlayedGames();
    }));
    // Expand/collapse details (rated)
    const expandBtn = li.querySelector('.expand-btn');
    const criticInline = li.querySelector('.critic-inline');
    if (expandBtn && criticInline) {
      expandBtn.onclick = () => {
        const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
        criticInline.style.display = expanded ? 'none' : 'inline-flex';
        expandBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      };
    }

    li.querySelector('.remove-btn').onclick = (e) => {
      const realIdx = playedGames.findIndex(g => g.id === game.id);
      playedGames.splice(realIdx, 1);
      localStorage.setItem('playedGames', JSON.stringify(playedGames));
      renderPlayedGames();
      // Refresh search results if we have a stored query so Added/Add reflects correctly
      if (lastSearchQuery) {
        searchGames(lastSearchQuery);
      }
    };
    gamesList.appendChild(li);
  });
}


async function searchGames(query) {
  searchResults.innerHTML = '<div>Searching...</div>';
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid response');
    searchResults.innerHTML = '';
    data.forEach(game => {
      const div = document.createElement('div');
      div.className = 'game-result';
      const alreadyRated = playedGames.some(g => g.id === game.id);
      div.innerHTML = `
        <img src="${game.cover || ''}" alt="${game.name}" />
        <div class="content">
          <div class="title-row">
            <div class="title-left">
              <div class="title-main">
                <strong>${game.name}</strong>
                  ${typeof game.critic === 'number' ? `<span class="critic-badge critic-inline" style="display:none;" title="Metacritic">${game.critic}%</span>` : ''}
                  ${typeof game.critic === 'number' ? `<button class="expand-btn" aria-expanded="false" title="Show Metacritic">▾</button>` : ''}
              </div>
              ${game.year ? `<span class="year-under">${game.year}</span>` : ''}
            </div>
            <div class="title-right">
              <button ${alreadyRated ? 'disabled' : ''} class="add-btn">${alreadyRated ? '✔️ Added' : 'Add'}</button>
            </div>
          </div>
        </div>
      `;
      const addBtn = div.querySelector('.add-btn');
      if (!alreadyRated) {
        addBtn.onclick = () => {
          playedGames.push({ ...game, rating: 0 });
          localStorage.setItem('playedGames', JSON.stringify(playedGames));
          renderPlayedGames();
          searchGames(query); // Refresh search results to update button
        };
      } else {
        addBtn.classList.add('added');
      }
      // Expand/collapse details (search)
      const expandBtn = div.querySelector('.expand-btn');
      const criticInline = div.querySelector('.critic-inline');
      if (expandBtn && criticInline) {
        expandBtn.onclick = () => {
          const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
          criticInline.style.display = expanded ? 'none' : 'inline-flex';
          expandBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        };
      }
      searchResults.appendChild(div);
    });
    if (data.length === 0) {
      searchResults.innerHTML = '<div>No results found.</div>';
    }
  } catch (e) {
    searchResults.innerHTML = '<div>Error searching games.</div>';
  }
}


// Tab switching
tabSearch.onclick = () => {
  tabSearch.classList.add('active');
  tabRated.classList.remove('active');
  searchSection.style.display = '';
  ratedSection.style.display = 'none';
};
tabRated.onclick = () => {
  tabRated.classList.add('active');
  tabSearch.classList.remove('active');
  searchSection.style.display = 'none';
  ratedSection.style.display = '';
  renderPlayedGames();
};

// "Home" title click: return to Search games tab
if (homeLink) {
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    tabSearch.click();
    window.scrollTo(0, 0);
    searchInput.focus();
  });
}

// Filters and search for rated games
ratedSearch.addEventListener('input', (e) => {
  ratedSearchValue = e.target.value;
  renderPlayedGames();
});
filterRelease.addEventListener('change', (e) => {
  filterReleaseValue = e.target.value;
  renderPlayedGames();
});
filterRating.addEventListener('change', (e) => {
  filterRatingValue = e.target.value;
  renderPlayedGames();
});

searchForm.onsubmit = (e) => {
  e.preventDefault();
  lastSearchQuery = searchInput.value.trim();
  searchGames(lastSearchQuery);
};

// Initial render
renderPlayedGames();
