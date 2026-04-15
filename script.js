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
  projects.unshift({
    id:Date.now(),
    show:showName,
    season,
    date:new Date().toLocaleString()
  });
  localStorage.setItem("tmdb_projects", JSON.stringify(projects));
}

function deleteAllProjects(){
  projects=[];
  localStorage.removeItem("tmdb_projects");
}
