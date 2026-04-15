/* LOADER */
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  const text = document.getElementById("loaderText");
  if (!loader || !text) return;

  const steps = [
    "Syncing with TMDB Servers...",
    "Preparing Metadata Workspace...",
    "Loading UI Modules..."
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) text.textContent = steps[i++];
  }, 900);

  setTimeout(() => {
    clearInterval(interval);
    loader.style.opacity = "0";
    loader.style.visibility = "hidden";
    loader.style.pointerEvents = "none";
  }, 3300);
});

/* CONFIG */
const API_KEY = "6a2e2c78bef124630ce8cb31ee0ef1d2";

let episodeImages = [];
let episodeMeta = [];
let movieImages = [];

let projects = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

/* UTILIDADES */
async function copySafe(text){
  try{
    await navigator.clipboard.writeText(text);
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

async function tmdb(endpoint){
  const res = await fetch(
    `https://api.themoviedb.org/3${endpoint}?api_key=${API_KEY}`
  );
  return res.json();
}

/* NAV */
function showEpisodes(){
  episodesView.style.display="block";
  moviesView.style.display="none";
}
function showMovies(){
  episodesView.style.display="none";
  moviesView.style.display="block";
}

/* PARSER */
function parseTV(url){
  const m = url.match(/tv\/(\d+).*season\/(\d+)/i);
  return m ? {id:m[1], season:+m[2]} : null;
}

/* EPISODES */
async function extractEpisodes(){
  const data = parseTV(tvLink.value.trim());
  if(!data) return alert("Link inválido");

  episodesResult.innerHTML="";
  episodeImages=[];
  episodeMeta=[];

  const show = await tmdb(`/tv/${data.id}`);
  const season = await tmdb(`/tv/${data.id}/season/${data.season}`);

  metaPanel.style.display="block";
  metaPanel.innerHTML=`
    <h3>${show.name}</h3>
    <p>${show.overview}</p>
    <p><b>Estado:</b> ${show.status}</p>
    <p><b>Idioma:</b> ${show.original_language.toUpperCase()}</p>
    <p><b>Rating:</b> ⭐ ${show.vote_average}</p>
    <div>${show.genres.map(g=>`<span class="genre">${g.name}</span>`).join("")}</div>
  `;

  season.episodes.forEach(ep=>{
    if(!ep.still_path)return;

    const code=`S${String(data.season).padStart(2,"0")}E${String(ep.episode_number).padStart(2,"0")}`;
    const image=`https://image.tmdb.org/t/p/original${ep.still_path}`;
    const index = episodeMeta.length;

    episodeImages.push(image);
    episodeMeta.push({
      season:data.season,
      episode:ep.episode_number,
      code,
      name:ep.name,
      description: ep.overview || "No description available",
      air_date:ep.air_date,
      rating:ep.vote_average,
      image,
      imageName:image.split("/").pop()
    });

   episodesResult.innerHTML+=`
  <div class="epBox">

    <input type="checkbox"
      id="chk-${index}"
      class="epCheck"
      onclick="toggleEpisodeSelection(${index})"
    >

    <img src="${image}"
      class="imgPrev"
      id="ep-${index}"
      onclick="openModal('${image}')"
    >

  </div>

  <div>
    <div class="epName">${code} - ${ep.name}</div>

    <div class="muted" style="margin:4px 0;">
      ${ep.overview || "No description available"}
    </div>

    <div class="epLink">${image}</div>
    <div class="muted">
      Emitido: ${ep.air_date} | ⭐ ${ep.vote_average}
    </div>
  </div>
`;

  });

  countInfo.textContent=`Episodios con imagen: ${episodeImages.length}`;

  /* ✅ FASE C CONEXIÓN */
  saveProject(show.name, data.season);
}

/* COPIAS BÁSICAS */
function copyEpisodeLinks(){copySafe(episodeImages.join("\n"))}
function copyEpisodeNames(){copySafe(episodeImages.map(l=>l.split("/").pop()).join("\n"))}

/* FASE B EXPORT */
function copyMetaTXT(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");
  copySafe(episodeMeta.map(e=>`
[${e.code}]
${e.name}
${e.air_date}
${e.image}
`).join("\n"));
}
function copyMetaJSON(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");
  copySafe(JSON.stringify(episodeMeta,null,2));
}
function copyMetaCSV(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");
  copySafe(
    "season,episode,code,name,air_date,rating,image\n"+
    episodeMeta.map(e=>`${e.season},${e.episode},${e.code},"${e.name}",${e.air_date},${e.rating},${e.image}`).join("\n")
  );
}
function copyKodiNFO(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");
  copySafe(
    episodeMeta.map(e=>`
<episodedetails>
<title>${e.name}</title>
<season>${e.season}</season>
<episode>${e.episode}</episode>
<aired>${e.air_date}</aired>
<rating>${e.rating}</rating>
</episodedetails>
`).join("\n")
  );
}

/* MOVIES */
function parseMovie(url){
  const m = url.match(/movie\/(\d+)/i);
  return m ? m[1] : null;
}

async function extractMovies(){
  const id=parseMovie(movieLink.value.trim());
  if(!id) return alert("Link inválido");

  moviesResult.innerHTML="";
  movieImages=[];

  const res=await tmdb(`/movie/${id}/images`);
  res.posters.forEach((p,i)=>{
    const image=`https://image.tmdb.org/t/p/original${p.file_path}`;
    movieImages.push(image);
    moviesResult.innerHTML+=`
      <img src="${image}" class="imgPrev" onclick="openModal('${image}')">
      <div>Poster ${i+1}: ${image}</div>
    `;
  });
}

function copyMovieLinks(){copySafe(movieImages.join("\n"))}

/* MODAL */
function openModal(url){
  modalImg.src=url;
  imageModal.style.display="flex";
}
function closeModal(e){
  if(e.target.id==="imageModal"||e.target.className==="close"){
    imageModal.style.display="none";
  }
}

/* ===== FASE C – PROYECTOS ===== */
function saveProject(showName, season){
  projects.unshift({
    id:Date.now(),
    show:showName,
    season,
    date:new Date().toLocaleString(),
    episodes:episodeMeta,
    favorite:false
  });
  localStorage.setItem("tmdb_projects", JSON.stringify(projects));
  renderProjects();
}

function renderProjects(){
  const list=document.getElementById("projectsList");
  if(!projects.length){
    list.innerText="No hay proyectos guardados";
    return;
  }
  list.innerHTML="";
  projects.forEach((p,i)=>{
    const div=document.createElement("div");
    div.className="project";
    div.innerHTML=`
      <span class="${p.favorite?"projectFav":""}">⭐</span>
      ${p.show} — Temporada ${p.season}<br>
      <small>${p.date}</small>
    `;
    div.onclick=()=>toggleFavorite(i);
    list.appendChild(div);
  });
}

function toggleFavorite(i){
  projects[i].favorite=!projects[i].favorite;
  localStorage.setItem("tmdb_projects", JSON.stringify(projects));
  renderProjects();
}

document.addEventListener("DOMContentLoaded", renderProjects);
/* ===============================
   FASE D (SEGURA)
   No toca UI ni render
================================ */

// índices de episodios seleccionados
let selectedEpisodeIndexes = new Set();

/* Selección manual (por consola o futuras UIs) */
function selectEpisode(index){
  if(index >= 0 && index < episodeMeta.length){
    selectedEpisodeIndexes.add(index);
  }
}

function unselectEpisode(index){
  selectedEpisodeIndexes.delete(index);
}

function clearSelection(){

  selectedEpisodeIndexes.clear();

  episodeMeta.forEach((_,index)=>{

    const img=document.getElementById(`ep-${index}`);
    const chk=document.getElementById(`chk-${index}`);

    if(img) img.classList.remove("epSelected");
    if(chk) chk.checked=false;
  });

}

/* Copiar links seleccionados */
function copySelectedLinks(){
  if(selectedEpisodeIndexes.size === 0){
    alert("No hay episodios seleccionados");
    return;
  }

  const links = [...selectedEpisodeIndexes]
    .map(i => episodeMeta[i].image);

  copySafe(links.join("\n"));
}

/* Descargar ZIP de seleccionados */
async function downloadSelectedZip(){
  if(selectedEpisodeIndexes.size === 0){
    alert("No hay episodios seleccionados");
    return;
  }

  const zip = new JSZip();
  const meta = [];

  for(const i of selectedEpisodeIndexes){
    const ep = episodeMeta[i];
    meta.push(ep);

    const resp = await fetch(ep.image);
    const blob = await resp.blob();
    zip.file(ep.imageName, blob);
  }

  zip.file("metadata.json", JSON.stringify(meta, null, 2));

  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = "tmdb_episodes_selection.zip";
  a.click();
}
/* ===============================
✅ BORRAR TODOS LOS PROYECTOS
================================ */
function deleteAllProjects(){
  if(!projects.length){
    alert("No hay proyectos para borrar");
    return;
  }

  const confirmDelete = confirm(
    "⚠️ ¿Seguro que deseas eliminar TODOS los proyectos?"
  );

  if(!confirmDelete) return;

  projects = [];
  localStorage.removeItem("tmdb_projects");
  renderProjects();

  alert("✅ Todos los proyectos fueron eliminados");
}
/* ===============================
✅ TXT CON DESCRIPCIÓN
================================ */
function copyMetaTXT_FULL(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");

  copySafe(episodeMeta.map(e=>`
[${e.code}]
${e.name}
${e.description}
${e.air_date}
${e.image}
`).join("\n"));
}
/* ===============================
✅ CSV CON DESCRIPCIÓN
================================ */
function copyMetaCSV_FULL(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");

  copySafe(
    "season,episode,code,name,description,air_date,rating,image\n"+
    episodeMeta.map(e=>
      `${e.season},${e.episode},${e.code},"${e.name}","${e.description}",${e.air_date},${e.rating},${e.image}`
    ).join("\n")
  );
}
/* ===============================
✅ KODI NFO CON DESCRIPCIÓN
================================ */
function copyKodiNFO_FULL(){
  if(!episodeMeta.length) return alert("Primero extrae una temporada");

  copySafe(
    episodeMeta.map(e=>`
<episodedetails>
<title>${e.name}</title>
<plot>${e.description}</plot>
<season>${e.season}</season>
<episode>${e.episode}</episode>
<aired>${e.air_date}</aired>
<rating>${e.rating}</rating>
</episodedetails>
`).join("\n")
  );
}
/* ===============================
✅ TOGGLE SELECCIÓN EPISODIOS
================================ */
function toggleEpisodeSelection(index){

  if(selectedEpisodeIndexes.has(index)){
    selectedEpisodeIndexes.delete(index);
    const img = document.getElementById(`ep-${index}`);
    if(img) img.classList.remove("epSelected");
  }
  else{
    selectedEpisodeIndexes.add(index);
    const img = document.getElementById(`ep-${index}`);
    if(img) img.classList.add("epSelected");
  }

}
function toggleEpisodeSelection(index){

  const img = document.getElementById(`ep-${index}`);
  const chk = document.getElementById(`chk-${index}`);

  if(selectedEpisodeIndexes.has(index)){
    selectedEpisodeIndexes.delete(index);
    if(img) img.classList.remove("epSelected");
    if(chk) chk.checked=false;
  }
  else{
    selectedEpisodeIndexes.add(index);
    if(img) img.classList.add("epSelected");
    if(chk) chk.checked=true;
  }

}
function selectAllEpisodes(){

  episodeMeta.forEach((_,index)=>{
    selectedEpisodeIndexes.add(index);

    const img=document.getElementById(`ep-${index}`);
    const chk=document.getElementById(`chk-${index}`);

    if(img) img.classList.add("epSelected");
    if(chk) chk.checked=true;
  });

}

function unselectAllEpisodes(){

  selectedEpisodeIndexes.clear();

  episodeMeta.forEach((_,index)=>{

    const img=document.getElementById(`ep-${index}`);
    const chk=document.getElementById(`chk-${index}`);

    if(img) img.classList.remove("epSelected");
    if(chk) chk.checked=false;
  });

}
/* ===============================
✅ COPY ONLY DESCRIPTIONS
================================ */
function copyDescriptionsOnly(){

  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  const onlyDescriptions = episodeMeta
    .map(e => e.description)
    .filter(desc => desc && desc.trim() !== "");

  copySafe(onlyDescriptions.join("\n"));
}