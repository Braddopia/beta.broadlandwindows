'use strict';
/* always run over HTTPS when hosted (local files and localhost are left alone) */
if(location.protocol=='http:'&&!/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname))location.replace('https://'+location.host+location.pathname+location.search+location.hash);
/* ==========================================================================
   01 · Core helpers: DOM, formatting, dates, validation & escaping
   ========================================================================== */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

/* ---- escaping (every piece of data that reaches innerHTML goes through esc) ---- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Safe inline handler: A('openContract',id) -> onclick="openContract(&quot;2402318&quot;)".
   Arguments are JSON-encoded then HTML-escaped, so names/ids containing quotes can't break out. */
const A=(fn,...a)=>`onclick="${esc(fn+'('+a.map(x=>JSON.stringify(x===undefined?null:x)).join(',')+')')}"`;
const AC=(ev,fn,...a)=>`${ev}="${esc(fn+'('+a.map(x=>x==='this'||x==='this.value'||x==='this.checked'?x:JSON.stringify(x===undefined?null:x)).join(',')+')')}"`;

/* ---- validation / sanitising ---- */
const SAFE={
  hex:v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:'#c9c6bd',
  img:v=>/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(String(v||''))?v:'',
  url:v=>{try{const u=new URL(String(v||''),location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch(e){return ''}},
  text:(v,max=200)=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max),
  num:(v,o={})=>{const{min=0,max=1e9,dp=2}=o;let n=parseFloat(v);if(!isFinite(n))return null;n=Math.min(max,Math.max(min,n));const f=10**dp;return Math.round(n*f)/f},
  code:v=>String(v||'').trim().replace(/[^\w\-. /]/g,'').slice(0,64),
  date:v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!isNaN(new Date(v+'T00:00'))?v:'',
  email:v=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(v||''))
};

/* ---- formatting ---- */
const money=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const m0=n=>'£'+Math.round(+n||0).toLocaleString('en-GB');
const pad=n=>String(n).padStart(2,'0');
const pc=(a,b)=>b?Math.round(100*a/b)+'%':'0%';
const sum=(a,f)=>a.reduce((x,y)=>x+(+f(y)||0),0);
const grp=(a,f)=>{const m={};a.forEach(x=>{const k=f(x)||'Unknown';(m[k]=m[k]||[]).push(x)});return Object.entries(m)};
const kb=x=>x<1e6?Math.max(1,Math.round(x/1e3))+' KB':(x/1e6).toFixed(1)+' MB';
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();

/* ---- dates ---- */
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>iso(new Date());
const addDays=n=>{const x=new Date();x.setDate(x.getDate()+n);return iso(x)};
const fd=d=>d?new Date(d+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Not set';
const fdl=d=>{const x=new Date(d+'T00:00');return isNaN(x)?'':x.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})};
const dslash=v=>v?v.split('-').reverse().join('/'):'';
const nowT=()=>new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
const isWk=k=>{const g=new Date(k+'T00:00').getDay();return g>0&&g<6};
const wd=(a,b)=>{let n=0;const d=new Date(a+'T00:00'),e=new Date(b+'T00:00');while(d<=e){const g=d.getDay();if(g&&g<6)n++;d.setDate(d.getDate()+1)}return n};
const weekRange=()=>{const n=new Date();n.setHours(0,0,0,0);const a=new Date(n);a.setDate(n.getDate()-((n.getDay()+6)%7));const b=new Date(a);b.setDate(a.getDate()+6);return[iso(a),iso(b)]};
const inWeek=d=>{const[a,b]=weekRange();return d>=a&&d<=b};
const greet=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'};
const BH={'2026-01-01':"New Year's Day",'2026-04-03':'Good Friday','2026-04-06':'Easter Monday','2026-05-04':'Early May bank holiday','2026-05-25':'Spring bank holiday','2026-08-31':'Summer bank holiday','2026-12-25':'Christmas Day','2026-12-28':'Boxing Day (substitute)','2027-01-01':"New Year's Day",'2027-03-26':'Good Friday','2027-03-29':'Easter Monday','2027-05-03':'Early May bank holiday','2027-05-31':'Spring bank holiday','2027-08-30':'Summer bank holiday','2027-12-27':'Christmas Day (substitute)','2027-12-28':'Boxing Day (substitute)'};

/* ---- ids ---- */
const uuid=()=>(window.crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c=='x'?r:r&3|8).toString(16)});
const shortId=p=>p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);

/* ---- files ---- */
const download=(name,blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
/* CSV with formula-injection protection (cells starting = + - @ are prefixed) */
const csvCell=v=>{let s=String(v??'');if(typeof v=='string'&&/^[=+\-@\t\r]/.test(s)&&!/^-?\d+(\.\d+)?$/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
const csvDownload=(name,rows)=>download(name,new Blob(['﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
const copyText=t=>{try{navigator.clipboard.writeText(t)}catch(e){}toast('Copied: '+String(t).slice(0,60))};

/* ---- SHA-256 (used for PIN hashes; works offline and on file://) ---- */
function sha256(str){
  const K=[],H=[];let n=2,c=0;const prime=x=>{for(let i=2;i*i<=x;i++)if(x%i==0)return false;return true},frac=x=>(x-(x|0))*4294967296|0;
  while(c<64){if(prime(n)){if(c<8)H[c]=frac(Math.pow(n,1/2));K[c]=frac(Math.pow(n,1/3));c++}n++}
  const b=unescape(encodeURIComponent(str)),l=b.length*8,w=[];
  for(let i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<((3-i%4)*8);
  w[l>>5]|=0x80<<(24-l%32);w[((l+64>>9)<<4)+15]=l;
  const r=(x,k)=>x>>>k|x<<(32-k);
  for(let j=0;j<w.length;j+=16){const W=[];for(let k=0;k<16;k++)W[k]=w[j+k]|0;const h=H.slice();
    for(let i=0;i<64;i++){if(i>=16){const a=W[i-15],d=W[i-2];W[i]=(W[i-16]+(r(a,7)^r(a,18)^a>>>3)+W[i-7]+(r(d,17)^r(d,19)^d>>>10))|0}
      const e=h[4],t1=(h[7]+(r(e,6)^r(e,11)^r(e,25))+((e&h[5])^(~e&h[6]))+K[i]+W[i])|0,a0=h[0],t2=((r(a0,2)^r(a0,13)^r(a0,22))+((a0&h[1])^(a0&h[2])^(h[1]&h[2])))|0;
      h.unshift((t1+t2)|0);h[4]=(h[4]+t1)|0;h.pop()}
    for(let i=0;i<8;i++)H[i]=(H[i]+h[i])|0}
  return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}

/* ---- star rating: full, half and empty stars (works in reports too: inline SVG with its own colours) ---- */
function stars(score,col='#ffd002',off='rgba(255,255,255,.28)'){const s=Math.max(0,Math.min(5,Math.round((+score||0)*2)/2));let h='';
  for(let i=1;i<=5;i++){const f=s>=i?1:s>=i-.5?.5:0,id='h'+Math.random().toString(36).slice(2,7);
    h+=`<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${f*100}%" stop-color="${col}"/><stop offset="${f*100}%" stop-color="${off}"/></linearGradient></defs><path fill="url(#${id})" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>`}
  return `<span class="stars" role="img" aria-label="${s} out of 5 stars">${h}</span>`}

/* ---- icons (24px stroke icons) ---- */
const svg=(p,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
const IC={
  home:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  layout:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  live:'M3 12h4l3-8 4 16 3-8h4',
  deliveries:'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  /* factory / warehouse */
  suppliers:'M2 21h20M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17M7 17h2M12 17h2M17 17h2',
  leads:'M3 5h18l-7 8v6l-4 2v-8z',
  contracts:'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  fitting:'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  service:'M14.7 6.3a4 4 0 005 5L11 20a2.1 2.1 0 01-3-3l8.7-8.7a4 4 0 01-2-2z',
  stock:'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  contacts:'M5 3h13a2 2 0 012 2v14a2 2 0 01-2 2H5zM9 3v18M13 9h4M13 13h4',
  staff:'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.4-3.4 3.2-5.5 6.5-5.5s6.1 2.1 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18.5 14.8c1.8.8 2.8 2.6 3 5.2',
  holidays:'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  reports:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  /* files: folder with a document */
  downloads:'M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 13h6M9 16h4',
  finance:'M12 2v20M17 6H9.5a3 3 0 000 6h5a3 3 0 010 6H6',
  admin:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  /* single person: head centred over shoulders */
  user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 21c.6-3.9 3.6-6 7.5-6s6.9 2.1 7.5 6',
  switch:'M7 7h12l-3-3M17 17H5l3 3',
  search:'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5',
  bell:'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  sun:'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon:'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
  plus:'M12 5v14M5 12h14',
  menu:'M4 6h16M4 12h16M4 18h16',
  scan:'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10',
  lock:'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  filter:'M3 5h18l-7 8v6l-4 2v-8z',
  sort:'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4',
  photo:'M4 6h3l2-2h6l2 2h3v13H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'
};
