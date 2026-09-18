// Stage 3: dispatch call lifecycle, service filtering, HUD, timer, distance and voice.
const VERSION='0.0.13';
const data=await window.DISPATCH_PROTOTYPE?.cityDataReady;
if(!data) throw new Error('Dispatch data is unavailable.');

const STATES=Object.freeze({INACTIVE:'INACTIVE',ENROUTE:'ENROUTE',ONSCENE:'ONSCENE',INSERVICE:'INSERVICE'});
let state=STATES.INACTIVE, activeCall=null, startedAt=0, timerId=0, lastDistance=null, lastCallId=null;
const mode=()=>window.__DISPATCH_MODE_RUNTIME__?.snapshot?.()||{};
const vehicle=()=>window.__CITY_DEMO_RUNTIME__?.snapshot?.().vehicle||null;
const rad=n=>n*Math.PI/180;
function distanceMeters(a,b,c,d){const R=6371000,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function callMatchesService(call,service){
  const text=`${call.main} ${call.sub}`.toLowerCase();
  const medical=/medical|ems|ambulance|patient|cardiac|breathing|overdose|injur|seizure|stroke|unconscious|sick|fall/.test(text);
  return service==='ems'?medical:!medical;
}
function eligibleCalls(){const service=mode().service;return service?data.dispatchCalls.filter(c=>callMatchesService(c,service)):[];}
function chooseCall(){const calls=eligibleCalls().filter(c=>c.id!==lastCallId);const pool=calls.length?calls:eligibleCalls();return pool[Math.floor(Math.random()*pool.length)]||null;}
function fmtTime(ms){const s=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function speak(call){try{if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const service=mode().service==='ems'?'Ambulance':'Fire';const u=new SpeechSynthesisUtterance(`${data.city.name} Control to ${service}. Respond ${call.sub}. ${call.name}, ${call.addr}.`);u.rate=.96;window.speechSynthesis.speak(u);}catch(_){}}

const style=document.createElement('style');style.textContent=`
#dispatch-hud{position:fixed;z-index:8800;top:12px;right:12px;width:min(330px,calc(100vw - 24px));padding:12px;border:1px solid #ffffff25;border-radius:14px;background:#07131de8;color:#eef9ff;box-shadow:0 12px 40px #0007;font:12px/1.35 system-ui;backdrop-filter:blur(8px)}#dispatch-hud[hidden]{display:none}#dispatch-hud.min .dispatch-body{display:none}.dispatch-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.dispatch-head strong{font-size:13px}.dispatch-min{border:0;background:transparent;color:#8dd8ff;cursor:pointer}.dispatch-body{margin-top:9px}.dispatch-call{font-size:15px;font-weight:800}.dispatch-address{color:#b6cbd8;margin:3px 0 8px}.dispatch-metrics{display:flex;gap:12px;color:#8dd8ff;font-weight:750}.dispatch-actions{display:flex;gap:7px;margin-top:10px}.dispatch-actions button{flex:1;border:1px solid #315166;border-radius:9px;padding:8px;background:#102635;color:#eef9ff;font:700 11px system-ui;cursor:pointer}.dispatch-actions button.primary{border-color:#5cc7ff;background:#0b4868}@media(max-width:600px){#dispatch-hud{top:8px;right:8px;width:min(285px,calc(100vw - 16px));padding:9px}.dispatch-address{margin-bottom:5px}}
`;document.head.append(style);
const hud=document.createElement('aside');hud.id='dispatch-hud';hud.hidden=true;hud.innerHTML=`<div class="dispatch-head"><strong id="dispatch-state">Dispatch</strong><button class="dispatch-min" aria-label="Minimize dispatch">—</button></div><div class="dispatch-body"><div class="dispatch-call" id="dispatch-call">Available</div><div class="dispatch-address" id="dispatch-address">Select Next Call when ready.</div><div class="dispatch-metrics"><span id="dispatch-time">00:00</span><span id="dispatch-distance">—</span></div><div class="dispatch-actions" id="dispatch-actions"></div></div>`;document.body.append(hud);
hud.querySelector('.dispatch-min').onclick=()=>hud.classList.toggle('min');
const el=id=>hud.querySelector(id);
function render(){
 const m=mode();hud.hidden=!(m.mode==='dispatch'&&m.baseId);if(hud.hidden)return;
 el('#dispatch-state').textContent=state==='INACTIVE'?`${m.service==='ems'?'EMS':'Fire'} · Available`:state.replace('ONSCENE','On Scene').replace('ENROUTE','En Route').replace('INSERVICE','In Service');
 el('#dispatch-call').textContent=activeCall?`${activeCall.main} · ${activeCall.sub}`:'Available';
 el('#dispatch-address').textContent=activeCall?`${activeCall.name} — ${activeCall.addr}`:'Ready for the next dispatch call.';
 el('#dispatch-time').textContent=startedAt?fmtTime(performance.now()-startedAt):'00:00';
 el('#dispatch-distance').textContent=lastDistance==null?'—':lastDistance<1000?`${Math.round(lastDistance)} m`:`${(lastDistance/1000).toFixed(1)} km`;
 const actions=el('#dispatch-actions');actions.innerHTML='';
 const add=(label,fn,primary=false)=>{const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=fn;actions.append(b);};
 if(state===STATES.INACTIVE)add('Next Call',startCall,true);
 else if(state===STATES.ENROUTE)add('On Scene',markOnScene,true);
 else if(state===STATES.ONSCENE)add('Clear Call',clearCall,true);
 else if(state===STATES.INSERVICE)add('Next Call',startCall,true);
}
function startCall(){activeCall=chooseCall();if(!activeCall)return;lastCallId=activeCall.id;state=STATES.ENROUTE;startedAt=performance.now();lastDistance=null;speak(activeCall);window.dispatchEvent(new CustomEvent('dispatch-call-started',{detail:{call:activeCall,service:mode().service}}));render();}
function markOnScene(){if(!activeCall)return;state=STATES.ONSCENE;window.dispatchEvent(new CustomEvent('dispatch-call-onscene',{detail:{call:activeCall,responseMs:performance.now()-startedAt}}));render();}
function clearCall(){if(!activeCall)return;window.dispatchEvent(new CustomEvent('dispatch-call-cleared',{detail:{call:activeCall,responseMs:performance.now()-startedAt}}));activeCall=null;startedAt=0;lastDistance=null;state=STATES.INSERVICE;render();}
function reset(){activeCall=null;startedAt=0;lastDistance=null;state=STATES.INACTIVE;render();}
function tick(){if(activeCall&&state===STATES.ENROUTE){const v=vehicle();const lat=Number(v?.lat),lon=Number(v?.lon);if(Number.isFinite(lat)&&Number.isFinite(lon))lastDistance=distanceMeters(lat,lon,activeCall.lat,activeCall.lng);}render();timerId=window.setTimeout(tick,500);}
window.addEventListener('dispatch-base-selected',reset);window.addEventListener('city-session-reset',reset);
window.__DISPATCH_GAMEPLAY__=Object.freeze({version:VERSION,states:STATES,snapshot:()=>({version:VERSION,state,call:activeCall,elapsedMs:startedAt?performance.now()-startedAt:0,distanceMeters:lastDistance,eligibleCount:eligibleCalls().length}),startCall,markOnScene,clearCall,reset});
tick();
