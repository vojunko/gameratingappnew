// IGDB API credentials are loaded from environment variables via a backend proxy
// See README.md for setup instructions

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://uwukjitggyegxkddqisi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dWtqaXRnZ3llZ3hrZGRxaXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjQ2OTAsImV4cCI6MjA4NDkwMDY5MH0.GY3zjvmkEHyCZx-H0x-wQ0kNiWwk9pKbfulxwc-z1P4"; // nech, co tam máš
const supabase = createClient(supabaseUrl, supabaseKey);

const authBar = document.getElementById("auth-bar");

let currentUser = null;
let playedGames = [];
let ratedSearchValue = '';
let filterReleaseValue = '';
let filterRatingValue = '';
let lastSearchQuery = '';

/* ===================== AUTH ===================== */

async function getCurrentUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
  } else {
    currentUser = null;
  }
}

async function renderAuthBar() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    authBar.innerHTML = `
      <button id="login-btn" class="login-btn discord-login">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg" alt="discord">
        <span>Login</span>
      </button>
    `;

    document.getElementById("login-btn").onclick = async () => {
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: window.location.origin
        }
      });
    };

    return;
  }

  const user = session.user;
  const meta = user.user_metadata;

  const avatar = meta.avatar_url || meta.picture || "";
  const name = meta.full_name || meta.name || meta.preferred_username || "User";

  authBar.innerHTML = `
    <div class="profile-wrapper">
      <div id="profile-btn" class="profile-btn">
        ${avatar ? `<img src="${avatar}" alt="avatar">` : ""}
        <span class="profile-name">${name}</span>
      </div>
      <div id="profile-menu" class="profile-menu">
        <button id="logout-btn">Logout</button>
      </div>
    </div>
  `;

  const profileBtn = document.getElementById("profile-btn");
  const profileMenu = document.getElementById("profile-menu");
  const logoutBtn = document.getElementById("logout-btn");

  profileBtn.onclick = (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("open");
  };

  document.addEventListener("click", () => {
    profileMenu.classList.remove("open");
  });

  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };
}

/* ===================== LOAD GAMES FROM DB ===================== */

async function loadPlayedGamesFromDB() {
  if (!currentUser) {
    playedGames = [];
    return;
  }

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Load games error:", error);
    playedGames = [];
    return;
  }

  playedGames = data.map(row => ({
    id: row.game_id,
    name: row.name,
    year: row.year,
    cover: row.cover,
    rating: row.rating,
    critic: row.critic
  }));
}

/* ===================== UI ELEMENTS ===================== */

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

/* ===================== STARS ===================== */

function renderStars(rating, onClick) {
  const starContainer = document.createElement('div');
  starContainer.className = 'star-rating';

  for (let i = 5; i >= 1; i--) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= rating ? ' filled' : '');
    star.innerHTML = '&#9733;';
    if (onClick) {
      star.style.cursor = 'pointer';
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

/* ===================== RENDER PLAYED GAMES ===================== */

async function renderPlayedGames() {
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

  filtered.forEach((game) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${game.cover || ''}" alt="${game.name}" />
      <div class="content">
        <div class="title-row">
          <div class="title-left">
            <div class="title-main">
              <strong>${game.name}</strong>
              
            </div>
            ${game.year ? `<span class="year-under">${game.year}</span>` : ''}
          </div>
          <div class="title-right">
            <div class="rating"></div>
            <button class="remove-btn" title="Remove">&#10006;</button>
          </div>
        </div>
      </div>
    `;

    const ratingDiv = li.querySelector('.rating');
    ratingDiv.appendChild(renderStars(game.rating || 0, async (star) => {
      game.rating = star;

      await supabase
        .from("games")
        .update({ rating: star })
        .eq("user_id", currentUser.id)
        .eq("game_id", game.id);

      await loadPlayedGamesFromDB();
      renderPlayedGames();
    }));

    li.querySelector('.remove-btn').onclick = async () => {
      await supabase
        .from("games")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("game_id", game.id);

      await loadPlayedGamesFromDB();
      renderPlayedGames();

      if (lastSearchQuery) {
        searchGames(lastSearchQuery);
      }
    };

    gamesList.appendChild(li);
  });
}

/* ===================== SEARCH GAMES ===================== */

async function searchGames(query) {
  searchResults.innerHTML = '<div>Searching...</div>';

  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();

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
                
              </div>
              ${game.year ? `<span class="year-under">${game.year}</span>` : ''}
            </div>
            <div class="title-right">
              <button ${alreadyRated ? 'disabled' : ''} class="add-btn">
                ${alreadyRated ? '✔️ Added' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      `;

      const addBtn = div.querySelector('.add-btn');

      if (!alreadyRated) {
        addBtn.onclick = async () => {
          if (!currentUser) {
            alert("You must be logged in to save games.");
            return;
          }

          const newGame = {
            user_id: currentUser.id,
            game_id: game.id,
            name: game.name,
            year: game.year,
            cover: game.cover,
            rating: 0,
            critic: game.critic
          };

          const { error } = await supabase
            .from("games")
            .insert([newGame]);

          if (error) {
            console.error("Insert error:", error);
            alert("Failed to save game.");
            return;
          }

          await loadPlayedGamesFromDB();
          renderPlayedGames();
          searchGames(query);
        };
      }

      searchResults.appendChild(div);
    });

    if (data.length === 0) {
      searchResults.innerHTML = '<div>No results found.</div>';
    }

  } catch (e) {
    console.error(e);
    searchResults.innerHTML = '<div>Error searching games.</div>';
  }
}

/* ===================== TABS & FILTERS ===================== */

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

if (homeLink) {
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    tabSearch.click();
    window.scrollTo(0, 0);
    searchInput.focus();
  });
}

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

/* ===================== INIT ===================== */

await getCurrentUser();
await renderAuthBar();
await loadPlayedGamesFromDB();
renderPlayedGames();

