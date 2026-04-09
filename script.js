window.onload = () => {

  const steps = [
    "Syncing with TMDB Servers...",
    "Preparing Episode Extraction Engine...",
    "Loading UI Modules..."
  ];

  const text = document.getElementById("loaderText");

  let i=0;

  const interval = setInterval(()=>{
    if(i<steps.length){
      text.innerText = steps[i];
      i++;
    }
  },900);

  setTimeout(()=>{
    clearInterval(interval);
    document.getElementById("loader").style.opacity="0";
    document.getElementById("loader").style.visibility="hidden";
  },3200);
};
const API_KEY = "6a2e2c78bef124630ce8cb31ee0ef1d2";

let episodeImages = [];
let movieImages = [];

async function copySafe(text){

  try{
    await navigator.clipboard.writeText(text);
  }catch{

    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);

    textarea.select();
    document.execCommand("copy");

    document.body.removeChild(textarea);
  }
}

function showEpisodes(){
  document.getElementById("episodesView").style.display = "block";
  document.getElementById("moviesView").style.display = "none";
}

function showMovies(){
  document.getElementById("episodesView").style.display = "none";
  document.getElementById("moviesView").style.display = "block";
}

async function tmdb(endpoint){
  const sep = endpoint.includes("?") ? "&" : "?";
  const res = await fetch(
    `https://api.themoviedb.org/3${endpoint}${sep}api_key=${API_KEY}`
  );
  return await res.json();
}

function parseTV(url){
  const m = url.match(/tv\/(\d+).*season\/(\d+)/i);
  return m ? {id:m[1], season:m[2]} : null;
}

async function extractEpisodes(){
  const input = document.getElementById("tvLink");
  const result = document.getElementById("episodesResult");

  const data = parseTV(input.value.trim());
  if(!data){ alert("Link inválido"); return; }

  result.innerHTML = "";
  episodeImages = [];

  const res = await tmdb(`/tv/${data.id}/season/${data.season}`);

  res.episodes.forEach(ep=>{

    if(!ep.still_path) return;

    const link = `https://image.tmdb.org/t/p/original${ep.still_path}`;
    episodeImages.push(link);

    const img = document.createElement("img");
    img.src = link;
    img.className = "imgPrev";
    img.onclick = () => openModal(link);

    const info = document.createElement("div");

    const name = document.createElement("div");
    name.className = "epName";
    name.innerText = `EP ${ep.episode_number} - ${ep.name}`;

    const txt = document.createElement("div");
    txt.className = "epLink";
    txt.innerText = link;

    info.appendChild(name);
    info.appendChild(txt);

    result.appendChild(img);
    result.appendChild(info);
  });
}

async function copyEpisodeLinks(){
  if(!episodeImages.length){ alert("No hay episodios"); return; }
  await copySafe(episodeImages.join("\n"));
}

async function copyEpisodeNames(){
  if(!episodeImages.length){ alert("No hay episodios"); return; }

  const names = episodeImages.map(l => l.split("/").pop());
  await copySafe(names.join("\n"));
}

function parseMovie(url){
  const m = url.match(/movie\/(\d+)/i);
  return m ? m[1] : null;
}

async function extractMovies(){
  const input = document.getElementById("movieLink");
  const result = document.getElementById("moviesResult");

  const id = parseMovie(input.value.trim());
  if(!id){ alert("Link inválido"); return; }

  result.innerHTML = "";
  movieImages = [];

  const res = await tmdb(`/movie/${id}/images`);

  res.posters.forEach((p,i)=>{

    const link = `https://image.tmdb.org/t/p/original${p.file_path}`;
    movieImages.push(link);

    const img = document.createElement("img");
    img.src = link;
    img.className = "imgPrev";
    img.onclick = () => openModal(link);

    const txt = document.createElement("div");
    txt.innerText = `Poster ${i+1}: ${link}`;

    result.appendChild(img);
    result.appendChild(txt);
  });
}

async function copyMovieLinks(){
  if(!movieImages.length){ alert("No hay posters"); return; }
  await copySafe(movieImages.join("\n"));
}

function openModal(url){
  document.getElementById("modalImg").src = url;
  document.getElementById("imageModal").style.display = "flex";
}

function closeModal(e){
  if(e.target.id === "imageModal" || e.target.className === "close"){
    document.getElementById("imageModal").style.display = "none";
  }
}