/* =========================================================
   ENTERTAINMENT METADATA AI
   ADVANCED TMDB + IMDB VERSION
   BY WILLIAM HERNANDEZ
========================================================= */

/* =========================================================
   API CONFIG
========================================================= */

const API_KEY = "6a2e2c78bef124630ce8cb31ee0ef1d2";

const OMDB_KEY = "1a4e9b4c";

const BASE_URL = "https://api.themoviedb.org/3";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const ORIGINAL_IMAGE = "https://image.tmdb.org/t/p/original";

/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let currentSeriesId = null;
let currentSeason = 1;

let episodeImages = [];
let movieImages = [];

let episodeTitles = [];

let episodeDescriptions = [];
/* =========================================================
   DOM ELEMENTS
========================================================= */

const searchBtn = document.getElementById("searchBtn");

const searchInput = document.getElementById("searchInput");

const resultsGrid = document.getElementById("resultsGrid");

const loader = document.getElementById("loader");

const errorMessage = document.getElementById("errorMessage");

const cursorGlow = document.querySelector(".cursor-glow");

/* =========================================================
   CURSOR GLOW
========================================================= */

document.addEventListener("mousemove", (e) => {

  cursorGlow.style.left = e.clientX + "px";

  cursorGlow.style.top = e.clientY + "px";
});

/* =========================================================
   LOADER
========================================================= */

window.onload = () => {

  const steps = [
    "Syncing Metadata Systems...",
    "Connecting IMDb Intelligence...",
    "Preparing AI Extraction Engine...",
    "Loading Entertainment Database...",
    "Initializing Visual Interface..."
  ];

  const text = document.querySelector("#loader p");

  let i = 0;

  const interval = setInterval(() => {

    if(i < steps.length){

      text.innerText = steps[i];

      i++;
    }

  }, 800);

  setTimeout(() => {

    clearInterval(interval);

    loader.style.opacity = "0";

    loader.style.visibility = "hidden";

  }, 3500);
};

/* =========================================================
   SEARCH EVENTS
========================================================= */

searchBtn.addEventListener("click", () => {

  searchMedia();
});

searchInput.addEventListener("keypress", (e) => {

  if(e.key === "Enter"){

    searchMedia();
  }
});

/* =========================================================
   TMDB FETCH
========================================================= */

async function tmdb(endpoint){

  const separator = endpoint.includes("?") ? "&" : "?";

  const response = await fetch(
    `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`
  );

  return await response.json();
}

/* =========================================================
   OMDB FETCH
========================================================= */

async function omdbByImdb(imdbID){

  const response = await fetch(

    `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbID}`

  );

  return await response.json();
}

/* =========================================================
   GET EXTERNAL IDS
========================================================= */

async function getExternalIds(type, id){

  return await tmdb(

    `/${type}/${id}/external_ids`

  );
}

/* =========================================================
   MAIN SEARCH
========================================================= */

async function searchMedia(){

  const query = searchInput.value.trim();

  if(!query) return;

  showLoader();

  clearResults();

  try{

    const data = await tmdb(
      `/search/multi?query=${encodeURIComponent(query)}`
    );

    hideLoader();

    if(!data.results || data.results.length === 0){

      showError("No metadata found.");

      return;
    }

    await renderResults(data.results);

  }catch(error){

    hideLoader();

    console.error(error);

    showError("Metadata engine failed.");
  }
}

/* =========================================================
   RENDER RESULTS
========================================================= */

async function renderResults(results){

  resultsGrid.innerHTML = "";

  for(const item of results){

    if(!item.poster_path) continue;

    const title =
      item.title ||
      item.name ||
      "Unknown Title";

    const year =
      (
        item.release_date ||
        item.first_air_date ||
        ""
      ).slice(0,4);

    const poster =
      `${IMAGE_BASE}${item.poster_path}`;

    const type = classifyContent(item);

    const overview =
      item.overview || "No overview available.";

    const rating =
      item.vote_average
      ? item.vote_average.toFixed(1)
      : "N/A";

    /* =========================================================
       IMDB ENRICHMENT
    ========================================================= */

    let imdbRating = "N/A";

    let imdbVotes = "N/A";

    let awards = "";

    let metascore = "N/A";

    let runtime = "N/A";

    let imdbID = null;

    try{

      const ids = await getExternalIds(
        item.media_type,
        item.id
      );

      if(ids.imdb_id){

        imdbID = ids.imdb_id;

        const imdbData =
          await omdbByImdb(ids.imdb_id);

        imdbRating =
          imdbData.imdbRating || "N/A";

        imdbVotes =
          imdbData.imdbVotes || "N/A";

        awards =
          imdbData.Awards || "";

        metascore =
          imdbData.Metascore || "N/A";

        runtime =
          imdbData.Runtime || "N/A";
      }

    }catch(error){

      console.log(
        "IMDb enrichment failed"
      );
    }

    const card = document.createElement("div");

    card.className = "card";

    card.innerHTML = `

      <div class="poster-wrapper">

        <img src="${poster}" alt="${title}">

      </div>

      <div class="card-content">

        <h2 class="card-title">${title}</h2>

        <div class="metadata-row">

          <div class="badge">${type}</div>

          <div class="badge">${year}</div>

          <div class="badge">
            TMDB ⭐ ${rating}
          </div>

          <div class="badge imdb-badge">
            IMDb ⭐ ${imdbRating}
          </div>

        </div>

        <div class="metadata-row">

          <div class="badge">
            🗳 ${imdbVotes}
          </div>

          <div class="badge">
            Metascore ${metascore}
          </div>

          <div class="badge">
            ${runtime}
          </div>

        </div>

        ${
          awards &&
          awards !== "N/A"
          ?
          `
          <p class="overview">
            🏆 ${awards}
          </p>
          `
          :
          ""
        }

        <p class="overview">
          ${overview.slice(0,180)}...
        </p>

        <div class="action-buttons">

          ${
            imdbID
            ?
            `
            <a
              href="https://www.imdb.com/title/${imdbID}"
              target="_blank"
              class="details-btn imdb-btn"
            >
              Open IMDb
            </a>
            `
            :
            ""
          }

          <button
            class="details-btn"
            onclick='generateAISummary(
              ${JSON.stringify(title)},
              ${JSON.stringify(overview)}
            )'
          >
            AI Summary
          </button>

          ${
            item.media_type === "tv"
            ?
            `
            <button class="details-btn"
              onclick="openSeries(${item.id})">
              View Seasons
            </button>
            `
            :
            ""
          }

          ${
            item.media_type === "movie"
            ?
            `
            <button class="details-btn"
              onclick="openMovieImages(${item.id})">
              Extract Posters
            </button>
            `
            :
            ""
          }

        </div>

      </div>
    `;

    resultsGrid.appendChild(card);
  }
}

/* =========================================================
   CONTENT CLASSIFIER
========================================================= */

function classifyContent(item){

  const title =
    (item.title || item.name || "").toLowerCase();

  const overview =
    (item.overview || "").toLowerCase();

  if(
    title.includes("podcast") ||
    overview.includes("podcast")
  ){
    return "Podcast";
  }

  if(
    title.includes("ufc") ||
    title.includes("wwe") ||
    title.includes("nba")
  ){
    return "Sports Event";
  }

  if(
    title.includes("gospel") ||
    title.includes("church") ||
    title.includes("worship")
  ){
    return "Gospel";
  }

  if(
    overview.includes("anime") ||
    overview.includes("manga")
  ){
    return "Anime";
  }

  if(
    overview.includes("documentary")
  ){
    return "Documentary";
  }

  if(item.media_type === "movie"){
    return "Movie";
  }

  if(item.media_type === "tv"){
    return "TV Series";
  }

  return "Entertainment";
}

/* =========================================================
   AI SUMMARY ENGINE
========================================================= */

function generateAISummary(title, overview){

  const text =
    overview.toLowerCase();

  const themes = [];

  if(text.includes("crime"))
    themes.push("Crime");

  if(text.includes("war"))
    themes.push("War");

  if(text.includes("future"))
    themes.push("Sci‑Fi");

  if(text.includes("love"))
    themes.push("Romance");

  if(text.includes("murder"))
    themes.push("Thriller");

  if(text.includes("space"))
    themes.push("Space");

  if(text.includes("anime"))
    themes.push("Anime");

  if(text.includes("detective"))
    themes.push("Mystery");

  const detected =
    themes.length
    ? themes.join(", ")
    : "Entertainment";

  alert(

`AI CONTENT ANALYSIS

TITLE:
${title}

DETECTED THEMES:
${detected}

AI OVERVIEW:
${overview}

AI RECOMMENDATION:
Recommended for users interested in:
${detected} storytelling.
`

  );
}

/* =========================================================
   OPEN SERIES
========================================================= */

async function openSeries(seriesId){

  currentSeriesId = seriesId;

  showLoader();

  try{

    const data = await tmdb(`/tv/${seriesId}`);

    hideLoader();

    renderSeriesView(data);

  }catch(error){

    hideLoader();

    console.error(error);

    showError("Failed loading series.");
  }
}

/* =========================================================
   RENDER SERIES VIEW
========================================================= */

function renderSeriesView(data){

  resultsGrid.innerHTML = "";

  const container = document.createElement("div");

  container.className = "series-container";

  const seasonsHTML = data.seasons.map(season => {

    return `

      <div class="season-card">

        <img
          src="${
            season.poster_path
            ? IMAGE_BASE + season.poster_path
            : ""
          }"
        >

        <h3>${season.name}</h3>

        <p>${season.episode_count} Episodes</p>

        <button
          class="details-btn"
          onclick="openSeasonEpisodes(
            ${data.id},
            ${season.season_number}
          )"
        >
          View Episodes
        </button>

      </div>
    `;

  }).join("");

  container.innerHTML = `

    <div class="series-header">

      <img
        class="series-poster"
        src="${IMAGE_BASE}${data.poster_path}"
      >

      <div>

        <h1>${data.name}</h1>

        <p class="overview">
          ${data.overview}
        </p>

        <div class="metadata-row">

          <div class="badge">
            ${data.number_of_seasons} Seasons
          </div>

          <div class="badge">
            ${data.number_of_episodes} Episodes
          </div>

        </div>

      </div>

    </div>

    <h2 class="section-title">
      Seasons
    </h2>

    <div class="season-grid">

      ${seasonsHTML}

    </div>
  `;

  resultsGrid.appendChild(container);
}

/* =========================================================
   OPEN SEASON EPISODES
========================================================= */

async function openSeasonEpisodes(seriesId, seasonNumber){

  currentSeason = seasonNumber;

  showLoader();

  try{

    const data = await tmdb(
      `/tv/${seriesId}/season/${seasonNumber}`
    );

    hideLoader();

    renderEpisodes(data);

  }catch(error){

    hideLoader();

    console.error(error);

    showError("Failed loading episodes.");
  }
}

/* =========================================================
   RENDER EPISODES
========================================================= */

function renderEpisodes(data){

  resultsGrid.innerHTML = "";

  episodeImages = [];

  episodeTitles = [];

  episodeDescriptions = [];

  const container = document.createElement("div");

  container.className = "episodes-container";

  const episodesHTML = data.episodes.map(ep => {

    const image = ep.still_path
      ? ORIGINAL_IMAGE + ep.still_path
      : "";

    const cleanTitle =
      ep.name || "Unknown Episode";

    const fullTitle =
      `EP ${ep.episode_number} - ${cleanTitle}`;

    const description =
      ep.overview || "No overview available.";

    if(image){

      episodeImages.push(image);
    }

    episodeTitles.push(cleanTitle);

    episodeDescriptions.push(description);

    return `

      <div class="episode-card">

        <img
          src="${image}"
          class="episode-image"
          onclick="openModal('${image}')"
        >

        <div class="episode-content">

          <h3>
            ${fullTitle}
          </h3>

          <p>
            ${description}
          </p>

          <div class="metadata-row">

            <div class="badge">
              ⭐ ${ep.vote_average.toFixed(1)}
            </div>

            <div class="badge">
              ${ep.air_date || "Unknown"}
            </div>

          </div>

          <div class="action-buttons">

            <button
              class="details-btn"
              onclick="copySingleImage('${image}')"
            >
              Copy Image Link
            </button>

            <button
              class="details-btn"
              onclick='copySingleTitle(
                ${JSON.stringify(cleanTitle)}
              )'
            >
              Copy Title
            </button>

            <button
              class="details-btn"
              onclick='copySingleDescription(
                ${JSON.stringify(description)}
              )'
            >
              Copy Description
            </button>

          </div>

        </div>

      </div>
    `;

  }).join("");

  container.innerHTML = `

    <div class="episodes-header">

      <h1>
        ${data.name}
      </h1>

      <div class="metadata-row">

        <button
          class="details-btn"
          onclick="copyEpisodeLinks()"
        >
          Copy All Episode Images
        </button>

        <button
          class="details-btn"
          onclick="copyEpisodeNames()"
        >
          Copy File Names
        </button>

        <button
          class="details-btn"
          onclick="copyAllEpisodeTitles()"
        >
          Copy All Titles
        </button>

        <button
          class="details-btn"
          onclick="copyAllEpisodeDescriptions()"
        >
          Copy All Descriptions
        </button>

      </div>

    </div>

    ${episodesHTML}
  `;

  resultsGrid.appendChild(container);
}

/* =========================================================
   MOVIE IMAGE EXTRACTION
========================================================= */

async function openMovieImages(movieId){

  showLoader();

  try{

    const data = await tmdb(`/movie/${movieId}/images`);

    hideLoader();

    renderMovieImages(data);

  }catch(error){

    hideLoader();

    console.error(error);

    showError("Failed extracting posters.");
  }
}

/* =========================================================
   RENDER MOVIE IMAGES
========================================================= */

function renderMovieImages(data){

  resultsGrid.innerHTML = "";

  movieImages = [];

  const container = document.createElement("div");

  container.className = "movie-images-container";

  const posters = data.posters.map((poster, index) => {

    const image =
      ORIGINAL_IMAGE + poster.file_path;

    movieImages.push(image);

    return `

      <div class="poster-card">

        <img
          src="${image}"
          class="poster-image"
          onclick="openModal('${image}')"
        >

        <button
          class="details-btn"
          onclick="copySingleImage('${image}')"
        >
          Copy Link
        </button>

      </div>
    `;

  }).join("");

  container.innerHTML = `

    <div class="episodes-header">

      <h1>Movie Posters</h1>

      <div class="metadata-row">

        <button
          class="details-btn"
          onclick="copyMovieLinks()"
        >
          Copy All Posters
        </button>

        <button
          class="details-btn"
          onclick="copyMovieNames()"
        >
          Copy Poster Names
        </button>

      </div>

    </div>

    <div class="poster-grid">

      ${posters}

    </div>
  `;

  resultsGrid.appendChild(container);
}

/* =========================================================
   COPY FUNCTIONS
========================================================= */

async function copySafe(text){

  try{

    await navigator.clipboard.writeText(text);

  }catch{

    const textarea =
      document.createElement("textarea");

    textarea.value = text;

    document.body.appendChild(textarea);

    textarea.select();

    document.execCommand("copy");

    document.body.removeChild(textarea);
  }
}

async function copyEpisodeLinks(){

  if(!episodeImages.length){
    alert("No episode images.");
    return;
  }

  await copySafe(episodeImages.join("\n"));

  alert("Episode image links copied.");
}

async function copyEpisodeNames(){

  if(!episodeImages.length){
    alert("No episode images.");
    return;
  }

  const names = episodeImages.map(
    img => img.split("/").pop()
  );

  await copySafe(names.join("\n"));

  alert("Episode file names copied.");
}
/* =========================================================
   COPY SINGLE TITLE
========================================================= */

async function copySingleTitle(title){

  await copySafe(title);

  alert("Episode title copied.");
}

/* =========================================================
   COPY SINGLE DESCRIPTION
========================================================= */

async function copySingleDescription(description){

  await copySafe(description);

  alert("Episode description copied.");
}

/* =========================================================
   COPY ALL TITLES
========================================================= */

async function copyAllEpisodeTitles(){

  if(!episodeTitles.length){

    alert("No episode titles.");

    return;
  }

  await copySafe(

    episodeTitles.join("\n")

  );

  alert("All episode titles copied.");
}

/* =========================================================
   COPY ALL DESCRIPTIONS
========================================================= */

async function copyAllEpisodeDescriptions(){

  if(!episodeDescriptions.length){

    alert("No episode descriptions.");

    return;
  }

  await copySafe(

    episodeDescriptions.join("\n\n")

  );

  alert("All episode descriptions copied.");
}
/* =========================================================
   MODAL
========================================================= */

function openModal(url){

  const modal = document.getElementById("imageModal");

  const img = document.getElementById("modalImg");

  img.src = url;

  modal.style.display = "flex";
}

function closeModal(e){

  if(
    e.target.id === "imageModal" ||
    e.target.className === "close"
  ){
    document.getElementById("imageModal").style.display = "none";
  }
}

/* =========================================================
   HELPERS
========================================================= */

function showLoader(){

  loader.classList.remove("hidden");
}

function hideLoader(){

  loader.classList.add("hidden");
}

function clearResults(){

  resultsGrid.innerHTML = "";
}

function showError(message){

  errorMessage.innerText = message;

  errorMessage.classList.remove("hidden");

  setTimeout(() => {

    errorMessage.classList.add("hidden");

  }, 3000);
}

/* =========================================================
   DEMO SEARCH
========================================================= */

window.addEventListener("load", () => {

  searchInput.value = "Breaking Bad";

  setTimeout(() => {

    searchMedia();

  }, 3800);
});