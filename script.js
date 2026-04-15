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
    loader.style.display="none";
  }, 3300);
});

/* CONFIG */
const API_KEY = "6a2e2c78bef124630ce8cb31ee0ef1d2";

let episodeImages = [];
let episodeMeta = [];
let movieImages = [];
let selectedEpisodeIndexes = new Set();

let projects = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

/* UTILIDADES */
async function copySafe(text){

  if(!text){
    alert("No hay datos para copiar");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert("✅ Copiado al portapapeles");
  }
  catch(err){

    try{
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      document.execCommand("copy");

      document.body.removeChild(textarea);

      alert("✅ Copiado (modo compatibilidad)");

    }catch(e){
      alert("❌ No se pudo copiar. Permite acceso al portapapeles.");
    }

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

  clearSelection();

  const data = parseTV(tvLink.value.trim());
  if(!data) return alert("Link inválido");

  episodesResult.innerHTML="";
  episodeImages=[];
  episodeMeta=[];

  const show = await tmdb(`/tv/${data.id}`);
  const season = await tmdb(`/tv/${data.id}/season/${data.season}`);

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
      <div class="muted">${ep.overview || ""}</div>
    </div>`;
  });

  countInfo.textContent=`Episodios con imagen: ${episodeImages.length}`;
  saveProject(show.name, data.season);
}

/* SELECCIÓN */
function toggleEpisodeSelection(index){
  const img=document.getElementById(`ep-${index}`);
  const chk=document.getElementById(`chk-${index}`);

  if(selectedEpisodeIndexes.has(index)){
    selectedEpisodeIndexes.delete(index);
    if(img) img.classList.remove("epSelected");
    if(chk) chk.checked=false;
  }else{
    selectedEpisodeIndexes.add(index);
    if(img) img.classList.add("epSelected");
    if(chk) chk.checked=true;
  }
}

function selectAllEpisodes(){
  episodeMeta.forEach((_,index)=>{
    selectedEpisodeIndexes.add(index);
    document.getElementById(`ep-${index}`)?.classList.add("epSelected");
    document.getElementById(`chk-${index}`).checked=true;
  });
}

function unselectAllEpisodes(){
  selectedEpisodeIndexes.clear();
  episodeMeta.forEach((_,index)=>{
    document.getElementById(`ep-${index}`)?.classList.remove("epSelected");
    document.getElementById(`chk-${index}`).checked=false;
  });
}

function clearSelection(){
  selectedEpisodeIndexes.clear();
  episodeMeta.forEach((_,index)=>{
    document.getElementById(`ep-${index}`)?.classList.remove("epSelected");
    const chk=document.getElementById(`chk-${index}`);
    if(chk) chk.checked=false;
  });
}

/* COPY */
function copyEpisodeLinks(){copySafe(episodeImages.join("\n"))}
function copyEpisodeNames(){copySafe(episodeMeta.map(e=>e.imageName).join("\n"))}

function copyMetaTXT_FULL(){
  copySafe(episodeMeta.map(e=>e.description).join("\n"));
}

function copyDescriptionsOnly(){
  copySafe(episodeMeta.map(e=>e.description).join("\n"));
}
/* ===============================
✅ RENDER PROYECTOS
================================ */
function renderProjects(){

  const list = document.getElementById("projectsList");

  if(!list) return;

  const stored = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

  if(!stored.length){
    list.innerHTML = "No hay proyectos guardados";
    return;
  }

  list.innerHTML = "";

  stored.forEach((p)=>{
    const div = document.createElement("div");
    div.className = "project";
    div.innerHTML = `
      ${p.show} — Temporada ${p.season}<br>
      <small>${p.date}</small>
    `;
    list.appendChild(div);
  });
}

/* ===============================
✅ GUARDAR PROYECTO
================================ */
function saveProject(showName, season){

  const stored = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

  const newProject = {
    id: Date.now(),
    show: showName,
    season: season,
    date: new Date().toLocaleString()
  };

  stored.unshift(newProject);

  localStorage.setItem("tmdb_projects", JSON.stringify(stored));

  renderProjects();
}

/* ===============================
✅ BORRAR PROYECTOS
================================ */
function deleteAllProjects(){

  const confirmDelete = confirm(
    "⚠️ ¿Seguro que deseas eliminar TODOS los proyectos?"
  );

  if(!confirmDelete) return;

  localStorage.removeItem("tmdb_projects");

  renderProjects();
}

/* ✅ CARGAR AL INICIO */
document.addEventListener("DOMContentLoaded", renderProjects);
``

/* ZIP */
async function downloadSelectedZip(){

  if(typeof JSZip==="undefined"){
    alert("JSZip no cargó");
    return;
  }

  if(!selectedEpisodeIndexes.size){
    alert("Selecciona episodios");
    return;
  }

  const zip=new JSZip();

  for(const i of selectedEpisodeIndexes){
    const ep=episodeMeta[i];
    const resp=await fetch(ep.image);
    const blob=await resp.blob();
    zip.file(ep.imageName, blob);
  }

  const content=await zip.generateAsync({type:"blob"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(content);
  a.download="selection.zip";
  a.click();
}

/* MODAL */
function openModal(url){
  modalImg.src=url;
  imageModal.style.display="flex";
}
function closeModal(e){
  if(e.target.id==="imageModal"){
    imageModal.style.display="none";
  }
}

/* PROYECTOS */
function saveProject(showName, season){

  const stored = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

  const newProject = {
    id:Date.now(),
    show:showName,
    season,
    date:new Date().toLocaleString()
  };

  stored.unshift(newProject);

  localStorage.setItem("tmdb_projects", JSON.stringify(stored));

  renderProjects();
}
/* ===============================
✅ META TXT
================================ */
function copyMetaTXT(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  copySafe(
    episodeMeta.map(e=>`
[${e.code}]
${e.name}
${e.air_date}
${e.image}
`).join("\n")
  );
}

/* ===============================
✅ META JSON
================================ */
function copyMetaJSON(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  copySafe(JSON.stringify(episodeMeta,null,2));
}

/* ===============================
✅ META CSV
================================ */
function copyMetaCSV(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  copySafe(
    "season,episode,code,name,air_date,rating,image\n"+
    episodeMeta.map(e=>
      `${e.season},${e.episode},${e.code},"${e.name}",${e.air_date},${e.rating},${e.image}`
    ).join("\n")
  );
}

/* ===============================
✅ KODI NFO
================================ */
function copyKodiNFO(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

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

/* ===============================
✅ TXT + DESCRIPTION
================================ */
function copyMetaTXT_FULL(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  copySafe(
    episodeMeta.map(e=>`
[${e.code}]
${e.name}
${e.description}
${e.air_date}
${e.image}
`).join("\n")
  );
}

/* ===============================
✅ CSV + DESCRIPTION
================================ */
function copyMetaCSV_FULL(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  copySafe(
    "season,episode,code,name,description,air_date,rating,image\n"+
    episodeMeta.map(e=>
      `${e.season},${e.episode},${e.code},"${e.name}","${e.description}",${e.air_date},${e.rating},${e.image}`
    ).join("\n")
  );
}

/* ===============================
✅ KODI + PLOT
================================ */
function copyKodiNFO_FULL(){
  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

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
function renderProjects(){

  const list=document.getElementById("projectsList");

  if(!list) return;

  const stored = JSON.parse(localStorage.getItem("tmdb_projects")) || [];

  if(!stored.length){
    list.innerHTML="No hay proyectos guardados";
    return;
  }

  list.innerHTML="";

  stored.forEach((p,i)=>{
    const div=document.createElement("div");
    div.className="project";
    div.innerHTML=`
      ${p.show} — Temporada ${p.season}<br>
      <small>${p.date}</small>
    `;
    list.appendChild(div);
  });
}
``
document.addEventListener("DOMContentLoaded", renderProjects);

/* ===============================
✅ COPY EPISODE TITLES
================================ */
function copyEpisodeTitles(){

  if(!episodeMeta.length){
    alert("Primero extrae una temporada");
    return;
  }

  const titles = episodeMeta
    .map(e => e.name)
    .filter(name => name && name.trim() !== "");

  copySafe(titles.join("\n"));
}
