// Stage 4: Cesium incident target, nearest-road access point, and automatic arrival.
const VERSION='0.0.14';
const data=await window.DISPATCH_PROTOTYPE?.cityDataReady;
if(!data) throw new Error('Dispatch data is unavailable.');
const gameplay=()=>window.__DISPATCH_GAMEPLAY__;
const runtime=()=>window.__CITY_DEMO_RUNTIME__;
const rad=n=>n*Math.PI/180;
function distanceMeters(a,b,c,d){const R=6371000,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function projectLocal(lat,lon,lat0,lon0){const k=111320;return {x:(lon-lon0)*k*Math.cos(rad(lat0)),y:(lat-lat0)*k};}
function unprojectLocal(x,y,lat0,lon0){const k=111320;return {lat:lat0+y/k,lng:lon0+x/(k*Math.cos(rad(lat0)))};}
function nearestPointOnSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;if(!d)return a;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d));return{x:a.x+t*dx,y:a.y+t*dy};}
let roadsPromise=null;
async function loadRoads(){
 if(roadsPromise)return roadsPromise;
 roadsPromise=fetch(data.roads.dataUrl,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error(`Road data failed (${r.status})`);return r.json();}).then(geo=>{
  const segments=[];
  for(const f of geo.features||[]){const g=f.geometry||{};const lines=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];for(const line of lines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];if(a?.length>=2&&b?.length>=2)segments.push([Number(a[1]),Number(a[0]),Number(b[1]),Number(b[0])]);}}
  return segments;
 }).catch(error=>{console.warn('[Dispatch prototype] road access fallback unavailable:',error);return[];});
 return roadsPromise;
}
async function nearestRoadAccess(call){
 const segments=await loadRoads();if(!segments.length)return {lat:call.lat,lng:call.lng,distanceToRoad:0,fallback:true};
 const lat0=call.lat,lon0=call.lng,p={x:0,y:0};let best=null,bestD=Infinity;
 for(const s of segments){const a=projectLocal(s[0],s[1],lat0,lon0),b=projectLocal(s[2],s[3],lat0,lon0);const q=nearestPointOnSegment(p,a,b),d=Math.hypot(q.x,q.y);if(d<bestD){bestD=d;best=q;}}
 return {...unprojectLocal(best.x,best.y,lat0,lon0),distanceToRoad:bestD,fallback:false};
}
let active=null,entity=null,arrivalLat=null,arrivalLng=null,arrivalRadius=50,arrived=false,token=0;
function removeEntity(){try{const v=runtime()?.getViewer?.();if(v&&entity)v.entities.remove(entity);}catch(_){}entity=null;}
function marker(call,access){
 removeEntity();const v=runtime()?.getViewer?.();const Cesium=window.Cesium;if(!v||!Cesium)return;
 const radius=Math.max(10,Number(call.radius)||50);
 entity=v.entities.add({id:`dispatch-incident-${call.id}`,position:Cesium.Cartesian3.fromDegrees(access.lng,access.lat,2),ellipse:{semiMajorAxis:radius,semiMinorAxis:radius,height:1.5,material:Cesium.Color.RED.withAlpha(.20),outline:true,outlineColor:Cesium.Color.ORANGE.withAlpha(.9)},point:{pixelSize:10,color:Cesium.Color.ORANGE,outlineColor:Cesium.Color.WHITE,outlineWidth:2,heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND},label:{text:'INCIDENT',font:'700 12px system-ui',fillColor:Cesium.Color.WHITE,showBackground:true,backgroundColor:Cesium.Color.BLACK.withAlpha(.65),pixelOffset:new Cesium.Cartesian2(0,-24),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,1800)}});
}
async function activate(call){
 const my=++token;active=call;arrived=false;arrivalRadius=Math.max(10,Number(call.radius)||50);const access=await nearestRoadAccess(call);if(my!==token||active?.id!==call.id)return;
 // If the incident is already road-adjacent, preserve its exact coordinate. Otherwise stop on the nearest drivable road.
 const useRoad=access.distanceToRoad>Math.max(12,arrivalRadius*.35);arrivalLat=useRoad?access.lat:call.lat;arrivalLng=useRoad?access.lng:call.lng;marker(call,{lat:arrivalLat,lng:arrivalLng});
 window.dispatchEvent(new CustomEvent('dispatch-arrival-target-ready',{detail:{callId:call.id,lat:arrivalLat,lng:arrivalLng,radius:arrivalRadius,incidentLat:call.lat,incidentLng:call.lng,roadOffsetMeters:access.distanceToRoad}}));
}
function clear(){++token;active=null;arrivalLat=arrivalLng=null;arrived=false;removeEntity();}
window.addEventListener('dispatch-call-started',e=>activate(e.detail.call));window.addEventListener('dispatch-call-cleared',clear);window.addEventListener('dispatch-base-selected',clear);window.addEventListener('city-session-reset',clear);
function tick(){
 const g=gameplay()?.snapshot?.(),v=runtime()?.snapshot?.().vehicle;if(active&&g?.state==='ENROUTE'&&!arrived&&Number.isFinite(arrivalLat)&&Number.isFinite(arrivalLng)&&Number.isFinite(Number(v?.lat))&&Number.isFinite(Number(v?.lon))){const d=distanceMeters(Number(v.lat),Number(v.lon),arrivalLat,arrivalLng);if(d<=arrivalRadius){arrived=true;gameplay()?.markOnScene?.();removeEntity();window.dispatchEvent(new CustomEvent('dispatch-auto-arrived',{detail:{callId:active.id,distanceMeters:d,radius:arrivalRadius}}));}}
 window.setTimeout(tick,250);
}
window.__DISPATCH_INCIDENT_SPATIAL__=Object.freeze({version:VERSION,snapshot:()=>({version:VERSION,callId:active?.id||null,arrivalLat,arrivalLng,arrivalRadius,arrived}),nearestRoadAccess});tick();
