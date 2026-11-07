// ===== Gallery =====
const gallery = document.getElementById('gallery');
const images = [];
for (let i = 1; i <= 66; i++) {
  if (i === 17) continue; // logo used in header
  const n = String(i).padStart(2,'0');
  images.push(`assets/img/photo-${n}.jpg`);
}
// pension photos (for lightbox)
const pensionImgs = ['assets/pension/pension-01a.jpg','assets/pension/pension-01b.jpg','assets/pension/pension-02a.jpg','assets/pension/pension-02b.jpg','assets/pension/pension-03a.jpg','assets/pension/pension-03b.jpg','assets/pension/pension-04a.jpg','assets/pension/pension-04b.jpg','assets/pension/pension-05a.jpg','assets/pension/pension-05b.jpg','assets/pension/pension-05c.jpg','assets/pension/pension-05d.jpg','assets/pension/pension-05e.jpg'];
pensionImgs.forEach(p=>{ if(!images.includes(p)) images.push(p); });
window.openPensionLB = function(src){ const i = images.indexOf(src); if(i>=0) openLightbox(i); };
let lbIndex = 0;
images.forEach((src,i)=>{
  const img = document.createElement('img');
  img.src = src;
  img.loading = 'lazy';
  img.alt = `Chata U Vlka — foto ${i+1}`;
  img.addEventListener('click',()=>openLightbox(i));
  gallery.appendChild(img);
});

function openLightbox(i){ lbIndex=i; document.getElementById('lbImg').src=images[i]; document.getElementById('lightbox').hidden=false; }
function closeLightbox(){ document.getElementById('lightbox').hidden=true; }
function lbNav(d){ lbIndex=(lbIndex+d+images.length)%images.length; document.getElementById('lbImg').src=images[lbIndex]; }

// ===== Calendar =====
const bookedDates = new Set();
const ECHALUPY_DEFAULT = [
  {from:"2026-10-03", to:"2026-10-06"},
  {from:"2026-10-12", to:"2026-10-14"},
  {from:"2026-10-19", to:"2026-10-25"}
];
function fmtDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function addRanges(list){
  (list||[]).forEach(r=>{
    if(!r||!r.from||!r.to) return;
    for(let x=new Date(r.from+"T12:00:00"); x<new Date(r.to+"T12:00:00"); x.setDate(x.getDate()+1)){
      bookedDates.add(fmtDate(x));
    }
  });
}
function rebuildBooked(){
  bookedDates.clear();
  addRanges(ECHALUPY_DEFAULT);
  try{ const s=JSON.parse(localStorage.getItem('echalupy_reservations')||'null'); if(Array.isArray(s)) addRanges(s); }catch(e){}
  try{ JSON.parse(localStorage.getItem('bookings')||'[]').forEach(b=>addRanges([{from:b.in,to:b.out}])); }catch(e){}
}
rebuildBooked();
function setSyncStatus(msg){ const el=document.getElementById('syncStatus'); if(el) el.textContent=msg; }
window.syncEchalupy = function(text){
  let arr;
  try{
    const m = String(text).match(/\[[\s\S]*\]/);
    arr = JSON.parse(m ? m[0] : text);
  }catch(e){ setSyncStatus('Neplatný formát. Vložte JSON pole rezervací z e-chalupy.cz.'); return; }
  if(!Array.isArray(arr)){ setSyncStatus('Očekává se pole rezervací (window.propertyReservations).'); return; }
  localStorage.setItem('echalupy_reservations', JSON.stringify(arr));
  rebuildBooked();
  renderCalendar();
  const info = document.getElementById('syncDate');
  if(info) info.textContent = new Date().toLocaleDateString('cs-CZ');
  setSyncStatus('Obsazenost aktualizována ('+arr.length+' rezervací).');
};

let viewDate = new Date();
let selectedIn = null, selectedOut = null;

function renderCalendar(){
  const grid = document.getElementById('calGrid');
  const label = document.getElementById('monthLabel');
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const monthNames = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
  label.textContent = `${monthNames[m]} ${y}`;
  grid.innerHTML='';
  const first = new Date(y,m,1);
  const startWeekday = (first.getDay()+6)%7; // Monday=0
  const daysInMonth = new Date(y,m+1,0).getDate();
  for(let i=0;i<startWeekday;i++){ const e=document.createElement('div'); e.className='cal-day empty'; grid.appendChild(e);}
  const todayStr = new Date().toISOString().slice(0,10);
  for(let d=1;d<=daysInMonth;d++){
    const str = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const el = document.createElement('div');
    el.className='cal-day';
    el.textContent=d;
    if(str===todayStr) el.classList.add('today');
    if(bookedDates.has(str)) el.classList.add('booked');
    if(selectedIn && selectedOut){
      if(str===selectedIn||str===selectedOut) el.classList.add('selected');
      else if(str>selectedIn && str<selectedOut) el.classList.add('inrange');
    } else if(selectedIn && str===selectedIn) el.classList.add('selected');
    el.addEventListener('click',()=>onDayClick(str));
    grid.appendChild(el);
  }
}
function onDayClick(str){
  if(bookedDates.has(str)) return;
  if(!selectedIn || (selectedIn && selectedOut)){
    selectedIn = str; selectedOut = null;
  } else if(str <= selectedIn){
    selectedIn = str;
  } else {
    // check no booked in between
    let ok=true;
    for(let x=new Date(selectedIn+"T12:00:00"); x<new Date(str+"T12:00:00"); x.setDate(x.getDate()+1)){
      if(bookedDates.has(fmtDate(x))){ ok=false; break; }
    }
    if(ok){ selectedOut=str; } else { selectedIn=str; selectedOut=null; }
  }
  // sync form dates
  if(selectedIn) document.getElementById('checkin').value=selectedIn;
  if(selectedOut) document.getElementById('checkout').value=selectedOut;
  renderCalendar();
  calcPrice();
}
document.getElementById('prevMonth').addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderCalendar(); });

// sync form -> calendar
['checkin','checkout'].forEach(id=>{
  document.getElementById(id).addEventListener('change',()=>{
    selectedIn = document.getElementById('checkin').value || null;
    selectedOut = document.getElementById('checkout').value || null;
    renderCalendar(); calcPrice();
  });
});

// ===== Price calc =====
function calcPrice(){
  const cin = document.getElementById('checkin').value;
  const cout = document.getElementById('checkout').value;
  const summary = document.getElementById('totalPrice');
  const info = document.getElementById('nightsInfo');
  if(!cin||!cout){ summary.textContent='0 Kč'; info.textContent=''; return; }
  const d1=new Date(cin), d2=new Date(cout);
  const nights = Math.round((d2-d1)/86400000);
  if(nights<=0){ summary.textContent='—'; info.textContent='Neplatný rozsah'; return; }
  // determine base rate per night by day-of-week & holiday-ish (weekend = Fri/Sat nights)
  let base=0;
  const cur=new Date(d1);
  for(let i=0;i<nights;i++){
    const day = cur.getDay(); // 0 Sun..6 Sat
    // weekend night if Friday or Saturday
    const isWeekend = (day===5||day===6);
    base += isWeekend ? 4500 : 3900; // per night (9000/2 for weekend)
    cur.setDate(cur.getDate()+1);
  }
  // child bed: priced when "2 adults + 1 child" format is selected
  const guests = document.querySelector('[name=guests]').value;
  const dog = document.querySelector('[name=dog]').checked;
  const breakfast = document.querySelector('[name=breakfast]').value;
  const hotTub = document.querySelector('[name=hotTub]').checked;
  const cinema = document.querySelector('[name=cinema]').checked;
  let extras = 0;
  if(guests === '3') extras += 1300;
  if(dog) extras += 1000;
  if(breakfast==='typical') extras += 550 * nights;
  if(breakfast==='mix') extras += 700 * nights;
  if(hotTub) extras += 1500;
  if(cinema) extras += 1000;
  const total = base + extras;
  summary.textContent = total.toLocaleString('cs-CZ') + ' Kč';
  info.textContent = `${nights} nocí · základ ${base.toLocaleString('cs-CZ')} Kč + doplňky ${extras.toLocaleString('cs-CZ')} Kč`;
}
document.querySelectorAll('#bookingForm input,#bookingForm select').forEach(el=>{
  el.addEventListener('change',calcPrice);
});

// ===== Form submit =====
document.getElementById('bookingForm').addEventListener('submit', e=>{
  const data = Object.fromEntries(new FormData(e.target));
  // ulozit rezervaciu lokalne
  const bookings = JSON.parse(localStorage.getItem('bookings')||'[]');
  bookings.push({in:data.checkin,out:data.checkout,name:data.name});
  localStorage.setItem('bookings',JSON.stringify(bookings));
  // oznacit dni v kalendari
  for(let x=new Date(data.checkin+"T12:00:00"); x<new Date(data.checkout+"T12:00:00"); x.setDate(x.getDate()+1)) bookedDates.add(fmtDate(x));
  rebuildBooked();
  renderCalendar();
  // form sa odosle nativne (POST -> FormSubmit -> skryty iframe), zobrazit potvrdenie
  setTimeout(()=>{
    e.target.hidden=true;
    document.getElementById('formSuccess').hidden=false;
  }, 1500);

});

// ===== Sync panel =====
const syncDateEl = document.getElementById('syncDate');
if(syncDateEl) syncDateEl.textContent = new Date().toLocaleDateString('cs-CZ');
const syncToggle = document.getElementById('syncToggle');
const syncBox = document.getElementById('syncBox');
if(syncToggle && syncBox){
  syncToggle.addEventListener('click', ()=>{ syncBox.hidden = !syncBox.hidden; });
}
const syncApply = document.getElementById('syncApply');
const syncText = document.getElementById('syncText');
if(syncApply && syncText){
  syncApply.addEventListener('click', ()=>{ window.syncEchalupy(syncText.value); syncText.value=''; if(syncBox) syncBox.hidden=true; });
}

// ===== Manual sync (via sync panel) =====
// Auto-sync neni aktivni; obsazenost se aktualizuje rucne pres panel "Aktualizovat obsazenost".

// ===== Misc =====
document.getElementById('year').textContent = new Date().getFullYear();
renderCalendar();
calcPrice();
