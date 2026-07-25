/* =========================================================
   ENTERTAINMENT METADATA AI
   TMDB + IMDb + TVMAZE
   SEASON NAVIGATION — CODEPEN FIX
========================================================= */

/* =========================================================
   API CONFIG
========================================================= */

const API_KEY = "6a2e2c78bef124630ce8cb31ee0ef1d2";
const OMDB_KEY = "1a4e9b4c";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const ORIGINAL_IMAGE = "https://image.tmdb.org/t/p/original";

const TVMAZE_API_KEY = "Tjf7WPpry7dP_5Gbj5UkuUtaqxlKjKI5";
const TVMAZE_BASE = "https://api.tvmaze.com";

/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let currentSeriesId = null;
let currentSeason = 1;
let currentSeriesSeasons = [];

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

document.addEventListener("mousemove", (event) => {
  if (!cursorGlow) {
    return;
  }

  cursorGlow.style.left = `${event.clientX}px`;
  cursorGlow.style.top = `${event.clientY}px`;
});

/* =========================================================
   INITIAL LOADER
========================================================= */

window.addEventListener("load", () => {
  const steps = [
    "Syncing Metadata Systems...",
    "Connecting IMDb Intelligence...",
    "Preparing AI Extraction Engine...",
    "Loading Entertainment Database...",
    "Initializing Visual Interface..."
  ];

  const loaderText = document.querySelector("#loader p");
  let currentStep = 0;

  showLoader();

  const interval = setInterval(() => {
    if (loaderText && currentStep < steps.length) {
      loaderText.textContent = steps[currentStep];
      currentStep++;
    }
  }, 800);

  setTimeout(() => {
    clearInterval(interval);
    hideLoader();
  }, 3500);
});

/* =========================================================
   SEARCH EVENTS
========================================================= */

if (searchBtn) {
  searchBtn.addEventListener("click", searchMedia);
}

if (searchInput) {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchMedia();
    }
  });
}

/* =========================================================
   FETCH HELPERS
========================================================= */

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return await response.json();
}

async function tmdb(endpoint) {
  const separator = endpoint.includes("?") ? "&" : "?";

  const url =
    `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;

  return await fetchJSON(url);
}

async function omdbByImdb(imdbID) {
  const url =
    `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(imdbID)}`;

  return await fetchJSON(url);
}

async function getExternalIds(type, id) {
  return await tmdb(`/${type}/${id}/external_ids`);
}

/* =========================================================
   TVMAZE FUNCTIONS
========================================================= */

async function tvmazeSearch(query) {
  return await fetchJSON(
    `${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(query)}`
  );
}

async function tvmazeShow(id) {
  return await fetchJSON(`${TVMAZE_BASE}/shows/${id}`);
}

async function tvmazeCast(id) {
  return await fetchJSON(`${TVMAZE_BASE}/shows/${id}/cast`);
}

async function tvmazeCrew(id) {
  return await fetchJSON(`${TVMAZE_BASE}/shows/${id}/crew`);
}

async function tvmazeEpisodes(id) {
  return await fetchJSON(`${TVMAZE_BASE}/shows/${id}/episodes`);
}

/* =========================================================
   IMAGE CREATOR
   CREATES REAL IMG ELEMENTS FOR CODEPEN
========================================================= */

function createImageElement({
  src,
  alt = "",
  className = "",
  clickable = false,
  onClick = null
}) {
  const image = document.createElement("img");

  image.src = src;
  image.alt = alt;
  image.loading = "lazy";

  if (className) {
    image.className = className;
  }

  if (clickable) {
    image.style.cursor = "pointer";
  }

  if (typeof onClick === "function") {
    image.addEventListener("click", onClick);
  }

  image.addEventListener("error", () => {
    image.style.display = "none";
  });

  return image;
}

/* =========================================================
   SEARCH MEDIA
========================================================= */

async function searchMedia() {
  if (!searchInput) {
    return;
  }

  const query = searchInput.value.trim();

  if (!query) {
    showError("Enter a movie, series or entertainment title.");
    return;
  }

  showLoader();
  clearResults();

  try {
    const [tmdbData, tvmazeResults] = await Promise.all([
      tmdb(`/search/multi?query=${encodeURIComponent(query)}`),
      tvmazeSearch(query).catch(() => [])
    ]);

    hideLoader();

    if (
      (!tmdbData.results || tmdbData.results.length === 0) &&
      tvmazeResults.length > 0
    ) {
      const convertedResults = tvmazeResults.map((item) => ({
        id: item.show.id,
        source: "TVMaze",
        media_type: "tv",
        name: item.show.name || "Unknown Title",

        overview: item.show.summary
          ? removeHTML(item.show.summary)
          : "No overview available.",

        poster_path:
          item.show.image?.original ||
          item.show.image?.medium ||
          "",

        vote_average:
          item.show.rating?.average || 0,

        first_air_date:
          item.show.premiered || ""
      }));

      await renderResults(convertedResults);
      return;
    }

    if (
      !tmdbData.results ||
      tmdbData.results.length === 0
    ) {
      showError("No metadata found.");
      return;
    }

    await renderResults(tmdbData.results);
  } catch (error) {
    hideLoader();

    console.error("Metadata engine failed:", error);

    showError("Metadata engine failed.");
  }
}

/* =========================================================
   RENDER RESULTS
========================================================= */

async function renderResults(results) {
  if (!resultsGrid) {
    return;
  }

  resultsGrid.innerHTML = "";

  for (const item of results) {
    if (!item.poster_path) {
      continue;
    }

    const title =
      item.title ||
      item.name ||
      "Unknown Title";

    const date =
      item.release_date ||
      item.first_air_date ||
      "";

    const year =
      date.slice(0, 4) ||
      "N/A";

    const posterURL = item.poster_path.startsWith("http")
      ? item.poster_path
      : `${IMAGE_BASE}${item.poster_path}`;

    const mediaType = classifyContent(item);

    const overview =
      item.overview ||
      "No overview available.";

    const numericRating = Number(item.vote_average);

    const tmdbRating =
      Number.isFinite(numericRating) &&
      numericRating > 0
        ? numericRating.toFixed(1)
        : "N/A";

    let imdbRating = "N/A";
    let imdbVotes = "N/A";
    let awards = "";
    let metascore = "N/A";
    let runtime = "N/A";
    let imdbID = null;

    if (
      item.source !== "TVMaze" &&
      (
        item.media_type === "movie" ||
        item.media_type === "tv"
      )
    ) {
      try {
        const externalIds = await getExternalIds(
          item.media_type,
          item.id
        );

        if (externalIds.imdb_id) {
          imdbID = externalIds.imdb_id;

          const imdbData = await omdbByImdb(imdbID);

          imdbRating = imdbData.imdbRating || "N/A";
          imdbVotes = imdbData.imdbVotes || "N/A";
          awards = imdbData.Awards || "";
          metascore = imdbData.Metascore || "N/A";
          runtime = imdbData.Runtime || "N/A";
        }
      } catch (error) {
        console.log("IMDb enrichment failed:", error);
      }
    }

    const sources = [
      item.source === "TVMaze"
        ? "TVMaze"
        : "TMDB"
    ];

    if (imdbID) {
      sources.push("IMDb");
    }

    const card = document.createElement("div");
    card.className = "card";

    const posterWrapper = document.createElement("div");
    posterWrapper.className = "poster-wrapper";

    const posterImage = createImageElement({
      src: posterURL,
      alt: title
    });

    posterWrapper.appendChild(posterImage);

    const cardContent = document.createElement("div");
    cardContent.className = "card-content";

    const cardTitle = document.createElement("h2");
    cardTitle.className = "card-title";
    cardTitle.textContent = title;

    const sourceBadge = document.createElement("div");
    sourceBadge.className = "source-badge";
    sourceBadge.textContent =
      `SOURCE: ${sources.join(" • ")}`;

    const mainMetadataRow = document.createElement("div");
    mainMetadataRow.className = "metadata-row";

    mainMetadataRow.appendChild(
      createBadge(mediaType)
    );

    mainMetadataRow.appendChild(
      createBadge(year)
    );

    mainMetadataRow.appendChild(
      createBadge(`TMDB ⭐ ${tmdbRating}`)
    );

    mainMetadataRow.appendChild(
      createBadge(
        `IMDb ⭐ ${imdbRating}`,
        "imdb-badge"
      )
    );

    cardContent.appendChild(cardTitle);
    cardContent.appendChild(sourceBadge);
    cardContent.appendChild(mainMetadataRow);

    if (runtime !== "N/A") {
      const secondaryMetadataRow =
        document.createElement("div");

      secondaryMetadataRow.className =
        "metadata-row";

      secondaryMetadataRow.appendChild(
        createBadge(`Runtime: ${runtime}`)
      );

      secondaryMetadataRow.appendChild(
        createBadge(
          `IMDb Votes: ${imdbVotes}`,
          "imdb-badge"
        )
      );

      secondaryMetadataRow.appendChild(
        createBadge(
          `Metascore: ${metascore}`,
          "imdb-badge"
        )
      );

      cardContent.appendChild(
        secondaryMetadataRow
      );
    }

    if (awards && awards !== "N/A") {
      const awardsText =
        document.createElement("p");

      awardsText.className = "overview";
      awardsText.textContent = `🏆 ${awards}`;

      cardContent.appendChild(awardsText);
    }

    const overviewText = document.createElement("p");
    overviewText.className = "overview";

    overviewText.textContent =
      overview.length > 180
        ? `${overview.slice(0, 180)}...`
        : overview;

    cardContent.appendChild(overviewText);

    const actionButtons =
      document.createElement("div");

    actionButtons.className =
      "action-buttons";

    if (imdbID) {
      const imdbButton =
        document.createElement("a");

      imdbButton.href =
        `https://www.imdb.com/title/${imdbID}`;

      imdbButton.target = "_blank";
      imdbButton.rel = "noopener noreferrer";

      imdbButton.className =
        "details-btn imdb-btn";

      imdbButton.textContent = "Open IMDb";

      actionButtons.appendChild(imdbButton);
    }

    const summaryButton =
      createButton("AI Summary");

    summaryButton.addEventListener("click", () => {
      generateAISummary(title, overview);
    });

    actionButtons.appendChild(summaryButton);

    if (
      item.media_type === "tv" &&
      item.source !== "TVMaze"
    ) {
      const seriesButton =
        createButton("View Seasons");

      seriesButton.addEventListener("click", () => {
        openSeries(item.id);
      });

      actionButtons.appendChild(seriesButton);
    }

    if (item.media_type === "movie") {
      const movieImagesButton =
        createButton("Extract Posters");

      movieImagesButton.addEventListener(
        "click",
        () => {
          openMovieImages(item.id);
        }
      );

      actionButtons.appendChild(
        movieImagesButton
      );
    }

    cardContent.appendChild(actionButtons);

    card.appendChild(posterWrapper);
    card.appendChild(cardContent);

    resultsGrid.appendChild(card);
  }

  if (!resultsGrid.children.length) {
    showError(
      "No results with available images were found."
    );
  }
}

/* =========================================================
   CREATE BADGE
========================================================= */

function createBadge(text, extraClass = "") {
  const badge = document.createElement("div");

  badge.className = extraClass
    ? `badge ${extraClass}`
    : "badge";

  badge.textContent = text;

  return badge;
}

/* =========================================================
   CREATE BUTTON
========================================================= */

function createButton(text, extraClass = "") {
  const button = document.createElement("button");

  button.type = "button";

  button.className = extraClass
    ? `details-btn ${extraClass}`
    : "details-btn";

  button.textContent = text;

  return button;
}

/* =========================================================
   CONTENT CLASSIFIER
========================================================= */

function classifyContent(item) {
  const title =
    (
      item.title ||
      item.name ||
      ""
    ).toLowerCase();

  const overview =
    (
      item.overview ||
      ""
    ).toLowerCase();

  if (
    title.includes("podcast") ||
    overview.includes("podcast")
  ) {
    return "Podcast";
  }

  if (
    title.includes("ufc") ||
    title.includes("wwe") ||
    title.includes("nba")
  ) {
    return "Sports Event";
  }

  if (
    title.includes("gospel") ||
    title.includes("church") ||
    title.includes("worship")
  ) {
    return "Gospel";
  }

  if (
    overview.includes("anime") ||
    overview.includes("manga")
  ) {
    return "Anime";
  }

  if (overview.includes("documentary")) {
    return "Documentary";
  }

  if (item.media_type === "movie") {
    return "Movie";
  }

  if (item.media_type === "tv") {
    return "TV Series";
  }

  return "Entertainment";
}

/* =========================================================
   AI SUMMARY ENGINE
========================================================= */

function generateAISummary(title, overview) {
  const text = overview.toLowerCase();
  const themes = [];

  if (text.includes("crime")) {
    themes.push("Crime");
  }

  if (text.includes("war")) {
    themes.push("War");
  }

  if (text.includes("future")) {
    themes.push("Sci-Fi");
  }

  if (text.includes("love")) {
    themes.push("Romance");
  }

  if (text.includes("murder")) {
    themes.push("Thriller");
  }

  if (text.includes("space")) {
    themes.push("Space");
  }

  if (text.includes("anime")) {
    themes.push("Anime");
  }

  if (text.includes("detective")) {
    themes.push("Mystery");
  }

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
${detected} storytelling.`
  );
}

/* =========================================================
   OPEN SERIES
========================================================= */

async function openSeries(seriesId) {
  currentSeriesId = seriesId;
  currentSeason = 1;
  currentSeriesSeasons = [];

  showLoader();

  try {
    const seriesData =
      await tmdb(`/tv/${seriesId}`);

    currentSeriesSeasons =
      (seriesData.seasons || [])
        .filter((season) => {
          return season.season_number > 0;
        })
        .sort((firstSeason, secondSeason) => {
          return (
            firstSeason.season_number -
            secondSeason.season_number
          );
        });

    try {
      const tvmazeResults =
        await tvmazeSearch(seriesData.name);

      if (tvmazeResults.length > 0) {
        const tvmazeID =
          tvmazeResults[0].show.id;

        await Promise.all([
          tvmazeShow(tvmazeID),
          tvmazeCast(tvmazeID),
          tvmazeCrew(tvmazeID),
          tvmazeEpisodes(tvmazeID)
        ]);
      }
    } catch (error) {
      console.log(
        "TVMaze enrichment failed:",
        error
      );
    }

    hideLoader();

    renderSeriesView(seriesData);
  } catch (error) {
    hideLoader();

    console.error(
      "Failed loading series:",
      error
    );

    showError("Failed loading series.");
  }
}

/* =========================================================
   RENDER SERIES VIEW
========================================================= */

function renderSeriesView(data) {
  resultsGrid.innerHTML = "";

  const container =
    document.createElement("div");

  container.className = "series-container";

  const seriesHeader =
    document.createElement("div");

  seriesHeader.className = "series-header";

  if (data.poster_path) {
    const seriesPoster = createImageElement({
      src: `${IMAGE_BASE}${data.poster_path}`,
      alt: data.name,
      className: "series-poster"
    });

    seriesHeader.appendChild(seriesPoster);
  }

  const seriesInfo =
    document.createElement("div");

  const seriesTitle =
    document.createElement("h1");

  seriesTitle.textContent =
    data.name || "Unknown Series";

  const seriesOverview =
    document.createElement("p");

  seriesOverview.className = "overview";

  seriesOverview.textContent =
    data.overview ||
    "No overview available.";

  const seriesMetadata =
    document.createElement("div");

  seriesMetadata.className = "metadata-row";

  seriesMetadata.appendChild(
    createBadge(
      `${data.number_of_seasons} Seasons`
    )
  );

  seriesMetadata.appendChild(
    createBadge(
      `${data.number_of_episodes} Episodes`
    )
  );

  seriesInfo.appendChild(seriesTitle);
  seriesInfo.appendChild(seriesOverview);
  seriesInfo.appendChild(seriesMetadata);

  seriesHeader.appendChild(seriesInfo);
  container.appendChild(seriesHeader);

  const seasonNavigation =
    createSeasonNavigation(
      currentSeriesSeasons,
      null
    );

  if (seasonNavigation) {
    container.appendChild(seasonNavigation);
  }

  const sectionTitle =
    document.createElement("h2");

  sectionTitle.className = "section-title";
  sectionTitle.textContent = "Seasons";

  container.appendChild(sectionTitle);

  const seasonGrid =
    document.createElement("div");

  seasonGrid.className = "season-grid";

  (data.seasons || []).forEach((season) => {
    const seasonCard =
      document.createElement("div");

    seasonCard.className = "season-card";

    if (season.poster_path) {
      const seasonImage =
        createImageElement({
          src: `${IMAGE_BASE}${season.poster_path}`,
          alt: season.name || "Season"
        });

      seasonCard.appendChild(seasonImage);
    }

    const seasonTitle =
      document.createElement("h3");

    seasonTitle.textContent =
      season.name ||
      `Season ${season.season_number}`;

    const episodeCount =
      document.createElement("p");

    episodeCount.textContent =
      `${season.episode_count} Episodes`;

    const openSeasonButton =
      createButton("View Episodes");

    openSeasonButton.addEventListener(
      "click",
      () => {
        openSeasonEpisodes(
          data.id,
          season.season_number
        );
      }
    );

    seasonCard.appendChild(seasonTitle);
    seasonCard.appendChild(episodeCount);
    seasonCard.appendChild(openSeasonButton);

    seasonGrid.appendChild(seasonCard);
  });

  container.appendChild(seasonGrid);
  resultsGrid.appendChild(container);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   CREATE SEASON NAVIGATION
========================================================= */

function createSeasonNavigation(
  seasons,
  activeSeason
) {
  if (!seasons || seasons.length === 0) {
    return null;
  }

  const navigation =
    document.createElement("div");

  navigation.className =
    "season-navigation";

  const label =
    document.createElement("label");

  label.className =
    "season-navigation-label";

  label.textContent = "Select Season";

  const select =
    document.createElement("select");

  select.className = "season-select";
  select.id = "seasonSelector";

  seasons.forEach((season) => {
    const option =
      document.createElement("option");

    option.value = season.season_number;

    option.textContent =
      season.name ||
      `Season ${season.season_number}`;

    option.selected =
      season.season_number === activeSeason;

    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    changeSeason(Number(select.value));
  });

  const buttonContainer =
    document.createElement("div");

  buttonContainer.className =
    "season-buttons";

  seasons.forEach((season) => {
    const seasonButton =
      createButton(
        season.name ||
        `Season ${season.season_number}`,
        "season-nav-btn"
      );

    seasonButton.dataset.season =
      season.season_number;

    if (
      season.season_number === activeSeason
    ) {
      seasonButton.classList.add("active");
    }

    seasonButton.addEventListener(
      "click",
      () => {
        changeSeason(
          season.season_number
        );
      }
    );

    buttonContainer.appendChild(
      seasonButton
    );
  });

  navigation.appendChild(label);
  navigation.appendChild(select);
  navigation.appendChild(buttonContainer);

  return navigation;
}

/* =========================================================
   CHANGE SEASON
========================================================= */

async function changeSeason(seasonNumber) {
  if (!currentSeriesId) {
    showError("No series selected.");
    return;
  }

  if (
    seasonNumber === currentSeason &&
    document.querySelector(
      ".episodes-container"
    )
  ) {
    return;
  }

  document
    .querySelectorAll(".season-nav-btn")
    .forEach((button) => {
      button.disabled = true;
    });

  await openSeasonEpisodes(
    currentSeriesId,
    seasonNumber
  );
}

/* =========================================================
   OPEN SEASON EPISODES
========================================================= */

async function openSeasonEpisodes(
  seriesId,
  seasonNumber
) {
  currentSeriesId = seriesId;
  currentSeason = seasonNumber;

  showLoader();

  try {
    if (currentSeriesSeasons.length === 0) {
      const seriesData =
        await tmdb(`/tv/${seriesId}`);

      currentSeriesSeasons =
        (seriesData.seasons || [])
          .filter((season) => {
            return season.season_number > 0;
          })
          .sort((firstSeason, secondSeason) => {
            return (
              firstSeason.season_number -
              secondSeason.season_number
            );
          });
    }

    const seasonData = await tmdb(
      `/tv/${seriesId}/season/${seasonNumber}`
    );

    hideLoader();

    renderEpisodes(seasonData);
  } catch (error) {
    hideLoader();

    console.error(
      "Failed loading episodes:",
      error
    );

    showError("Failed loading episodes.");
  }
}

/* =========================================================
   RENDER EPISODES
========================================================= */

function renderEpisodes(data) {
  resultsGrid.innerHTML = "";

  episodeImages = [];
  episodeTitles = [];
  episodeDescriptions = [];

  const container =
    document.createElement("div");

  container.className =
    "episodes-container";

  const seasonNavigation =
    createSeasonNavigation(
      currentSeriesSeasons,
      currentSeason
    );

  if (seasonNavigation) {
    container.appendChild(seasonNavigation);
  }

  const episodesHeader =
    document.createElement("div");

  episodesHeader.className =
    "episodes-header";

  const seasonTitle =
    document.createElement("h1");

  seasonTitle.textContent =
    data.name ||
    `Season ${currentSeason}`;

  const mainActions =
    document.createElement("div");

  mainActions.className = "metadata-row";

  const copyImagesButton =
    createButton(
      "Copy All Episode Images"
    );

  copyImagesButton.addEventListener(
    "click",
    copyEpisodeLinks
  );

  const copyFileNamesButton =
    createButton("Copy File Names");

  copyFileNamesButton.addEventListener(
    "click",
    copyEpisodeNames
  );

  const copyTitlesButton =
    createButton("Copy All Titles");

  copyTitlesButton.addEventListener(
    "click",
    copyAllEpisodeTitles
  );

  const copyDescriptionsButton =
    createButton("Copy All Descriptions");

  copyDescriptionsButton.addEventListener(
    "click",
    copyAllEpisodeDescriptions
  );

  mainActions.appendChild(copyImagesButton);
  mainActions.appendChild(copyFileNamesButton);
  mainActions.appendChild(copyTitlesButton);
  mainActions.appendChild(
    copyDescriptionsButton
  );

  episodesHeader.appendChild(seasonTitle);
  episodesHeader.appendChild(mainActions);

  container.appendChild(episodesHeader);

  (data.episodes || []).forEach((episode) => {
    const episodeCard =
      document.createElement("div");

    episodeCard.className = "episode-card";

    const imageURL = episode.still_path
      ? `${ORIGINAL_IMAGE}${episode.still_path}`
      : "";

    const episodeTitle =
      episode.name ||
      "Unknown Episode";

    const fullTitle =
      `EP ${episode.episode_number} - ${episodeTitle}`;

    const description =
      episode.overview ||
      "No overview available.";

    const numericRating =
      Number(episode.vote_average);

    const rating =
      Number.isFinite(numericRating) &&
      numericRating > 0
        ? numericRating.toFixed(1)
        : "N/A";

    if (imageURL) {
      episodeImages.push(imageURL);

      const episodeImage =
        createImageElement({
          src: imageURL,
          alt: episodeTitle,
          className: "episode-image",
          clickable: true,
          onClick: () => {
            openModal(imageURL);
          }
        });

      episodeCard.appendChild(
        episodeImage
      );
    }

    episodeTitles.push(episodeTitle);
    episodeDescriptions.push(description);

    const episodeContent =
      document.createElement("div");

    episodeContent.className =
      "episode-content";

    const titleElement =
      document.createElement("h3");

    titleElement.textContent = fullTitle;

    const descriptionElement =
      document.createElement("p");

    descriptionElement.textContent =
      description;

    const metadataRow =
      document.createElement("div");

    metadataRow.className = "metadata-row";

    metadataRow.appendChild(
      createBadge(`⭐ ${rating}`)
    );

    metadataRow.appendChild(
      createBadge(
        episode.air_date || "Unknown"
      )
    );

    const episodeActions =
      document.createElement("div");

    episodeActions.className =
      "action-buttons";

    if (imageURL) {
      const copyImageButton =
        createButton("Copy Image Link");

      copyImageButton.addEventListener(
        "click",
        () => {
          copySingleImage(imageURL);
        }
      );

      episodeActions.appendChild(
        copyImageButton
      );
    }

    const copyTitleButton =
      createButton("Copy Title");

    copyTitleButton.addEventListener(
      "click",
      () => {
        copySingleTitle(episodeTitle);
      }
    );

    const copyDescriptionButton =
      createButton("Copy Description");

    copyDescriptionButton.addEventListener(
      "click",
      () => {
        copySingleDescription(description);
      }
    );

    episodeActions.appendChild(
      copyTitleButton
    );

    episodeActions.appendChild(
      copyDescriptionButton
    );

    episodeContent.appendChild(titleElement);
    episodeContent.appendChild(
      descriptionElement
    );
    episodeContent.appendChild(metadataRow);
    episodeContent.appendChild(
      episodeActions
    );

    episodeCard.appendChild(episodeContent);
    container.appendChild(episodeCard);
  });

  resultsGrid.appendChild(container);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   MOVIE IMAGE EXTRACTION
========================================================= */

async function openMovieImages(movieId) {
  showLoader();

  try {
    const data = await tmdb(
      `/movie/${movieId}/images`
    );

    hideLoader();

    renderMovieImages(data);
  } catch (error) {
    hideLoader();

    console.error(
      "Failed extracting posters:",
      error
    );

    showError("Failed extracting posters.");
  }
}

/* =========================================================
   RENDER MOVIE IMAGES
========================================================= */

function renderMovieImages(data) {
  resultsGrid.innerHTML = "";
  movieImages = [];

  const container =
    document.createElement("div");

  container.className =
    "movie-images-container";

  const header =
    document.createElement("div");

  header.className = "episodes-header";

  const title =
    document.createElement("h1");

  title.textContent = "Movie Posters";

  const buttonsRow =
    document.createElement("div");

  buttonsRow.className = "metadata-row";

  const copyLinksButton =
    createButton("Copy All Posters");

  copyLinksButton.addEventListener(
    "click",
    copyMovieLinks
  );

  const copyNamesButton =
    createButton("Copy Poster Names");

  copyNamesButton.addEventListener(
    "click",
    copyMovieNames
  );

  buttonsRow.appendChild(copyLinksButton);
  buttonsRow.appendChild(copyNamesButton);

  header.appendChild(title);
  header.appendChild(buttonsRow);

  const posterGrid =
    document.createElement("div");

  posterGrid.className = "poster-grid";

  (data.posters || []).forEach(
    (poster, index) => {
      const imageURL =
        `${ORIGINAL_IMAGE}${poster.file_path}`;

      movieImages.push(imageURL);

      const posterCard =
        document.createElement("div");

      posterCard.className = "poster-card";

      const posterImage =
        createImageElement({
          src: imageURL,
          alt: `Movie poster ${index + 1}`,
          className: "poster-image",
          clickable: true,
          onClick: () => {
            openModal(imageURL);
          }
        });

      const copyButton =
        createButton("Copy Link");

      copyButton.addEventListener(
        "click",
        () => {
          copySingleImage(imageURL);
        }
      );

      posterCard.appendChild(posterImage);
      posterCard.appendChild(copyButton);

      posterGrid.appendChild(posterCard);
    }
  );

  container.appendChild(header);
  container.appendChild(posterGrid);

  resultsGrid.appendChild(container);
}

/* =========================================================
   COPY FUNCTIONS
========================================================= */

async function copySafe(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea =
      document.createElement("textarea");

    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    document.execCommand("copy");

    textarea.remove();
  }
}

async function copyEpisodeLinks() {
  if (!episodeImages.length) {
    alert("No episode images.");
    return;
  }

  await copySafe(
    episodeImages.join("\n")
  );

  alert("Episode image links copied.");
}

async function copyEpisodeNames() {
  if (!episodeImages.length) {
    alert("No episode images.");
    return;
  }

  const names = episodeImages.map((image) => {
    return image.split("/").pop();
  });

  await copySafe(names.join("\n"));

  alert("Episode file names copied.");
}

async function copySingleImage(image) {
  if (!image) {
    alert("No image available.");
    return;
  }

  await copySafe(image);

  alert("Image link copied.");
}

async function copySingleTitle(title) {
  await copySafe(title);

  alert("Episode title copied.");
}

async function copySingleDescription(
  description
) {
  await copySafe(description);

  alert("Episode description copied.");
}

async function copyAllEpisodeTitles() {
  if (!episodeTitles.length) {
    alert("No episode titles.");
    return;
  }

  await copySafe(
    episodeTitles.join("\n")
  );

  alert("All episode titles copied.");
}

async function copyAllEpisodeDescriptions() {
  if (!episodeDescriptions.length) {
    alert("No episode descriptions.");
    return;
  }

  await copySafe(
    episodeDescriptions.join("\n\n")
  );

  alert("All episode descriptions copied.");
}

async function copyMovieLinks() {
  if (!movieImages.length) {
    alert("No movie posters.");
    return;
  }

  await copySafe(
    movieImages.join("\n")
  );

  alert("Movie poster links copied.");
}

async function copyMovieNames() {
  if (!movieImages.length) {
    alert("No movie posters.");
    return;
  }

  const names = movieImages.map((image) => {
    return image.split("/").pop();
  });

  await copySafe(names.join("\n"));

  alert("Movie poster names copied.");
}

/* =========================================================
   IMAGE MODAL
========================================================= */

function openModal(url) {
  if (!url) {
    return;
  }

  const modal =
    document.getElementById("imageModal");

  const modalImage =
    document.getElementById("modalImg");

  if (!modal || !modalImage) {
    return;
  }

  modalImage.src = url;
  modal.style.display = "flex";

  document.body.style.overflow = "hidden";
}

function closeModal(event) {
  if (
    event.target.id === "imageModal" ||
    event.target.classList.contains("close")
  ) {
    const modal =
      document.getElementById("imageModal");

    if (modal) {
      modal.style.display = "none";
    }

    document.body.style.overflow = "";
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const modal =
      document.getElementById("imageModal");

    if (modal) {
      modal.style.display = "none";
    }

    document.body.style.overflow = "";
  }
});

/* =========================================================
   HELPERS
========================================================= */

function showLoader() {
  if (loader) {
    loader.classList.remove("hidden");
  }
}

function hideLoader() {
  if (loader) {
    loader.classList.add("hidden");
  }
}

function clearResults() {
  if (resultsGrid) {
    resultsGrid.innerHTML = "";
  }
}

function showError(message) {
  if (!errorMessage) {
    console.error(message);
    return;
  }

  errorMessage.textContent = message;

  errorMessage.classList.remove("hidden");

  setTimeout(() => {
    errorMessage.classList.add("hidden");
  }, 3000);
}

function removeHTML(value) {
  const temporaryElement =
    document.createElement("div");

  temporaryElement.innerHTML = value;

  return (
    temporaryElement.textContent ||
    temporaryElement.innerText ||
    ""
  );
}

/* =========================================================
   DEMO SEARCH
========================================================= */

window.addEventListener("load", () => {
  if (!searchInput) {
    return;
  }

  searchInput.value = "Breaking Bad";

  setTimeout(() => {
    searchMedia();
  }, 3800);
});