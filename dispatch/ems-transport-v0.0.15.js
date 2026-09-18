// Stage 5: EMS scene pickup -> PRHC transport -> hospital handover.
const VERSION='0.0.15';
const data=await window.DISPATCH_PROTOTYPE?.cityDataReady;
if(!data) throw new Error('Dispatch data is unavailable.');
const gameplay=()=>window.__DISPATCH_GAMEPLAY__;
const runtime=()=>window.__CITY_DEMO_RUNTIME__;
const mode=()=>window.__DISPATCH_MODE_RUNTIME__?.snapshot?.()||{};
const rad=n=>n*Math.PI/180;
function distanceMeters(a,b,c,d){const R=6371000,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
let phase='IDLE',call=null,responseMs=0,transportStartedAt=0,transportMs=0,entity=null,arrived=false;
function removeEntity(){try{const v=runtime()?.getViewer?.();if(v&&entity)v.entities.remove(entity);}catch(_){}entity=null;}
function addHospitalMarker(){removeEntity();const v=runtime()?.getViewer?.(),C=window.Cesium,h=data.hospital;if(!v||!C||!h)return;const r=Math.max(10,Number(h.checkpointRadius||h.radius)||40);entity=v.entities.add({id:'dispatch-hospital-prhc',position:C.Cartesian3.fromDegrees(Number(h.checkpointLng),Number(h.checkpointLat),2),ellipse:{semiMajorAxis:r,semiMinorAxis:r,height:1.5,material:C.Color.DODGERBLUE.withAlpha(.20),outline:true,outlineColor:C.Color.CYAN.withAlpha(.95)},point:{pixelSize:10,color:C.Color.CYAN,outlineColor:C.Color.WHITE,outlineWidth:2,heightReference:C.HeightReference.RELATIVE_TO_GROUND},label:{text:'PRHC · PATIENT DROP-OFF',font:'700 12px system-ui',fillColor:C.Color.WHITE,showBackground:true,backgroundColor:C.Color.BLACK.withAlpha(.65),pixelOffset:new C.Cartesian2(0,-24),distanceDisplayCondition:new C.DistanceDisplayCondition(0,1800)}});}
function emit(name,detail={}){window.dispatchEvent(new CustomEvent(name,{detail:{...detail,phase,call,responseMs,transportMs}}));}
function reset(){phase='IDLE';call=null;responseMs=0;transportStartedAt=0;transportMs=0;arrived=false;removeEntity();emit('dispatch-ems-reset');}
function beginTransport(e){if(mode().service!=='ems'||phase!=='TO_SCENE')return;call=e.detail.call;responseMs=Number(e.detail.responseMs)||0;phase='PICKUP';emit('dispatch-ems-pickup-started');window.setTimeout(()=>{if(phase!=='PICKUP')return;phase='TRANSPORTING';transportStartedAt=performance.now();arrived=false;addHospitalMarker();emit('dispatch-ems-transport-started',{hospital:data.hospital});},1200);}
function handover(){if(phase!=='TRANSPORTING'||arrived)return;arrived=true;transportMs=performance.now()-transportStartedAt;phase='HANDOVER';removeEntity();emit('dispatch-ems-hospital-arrived',{hospital:data.hospital});window.setTimeout(()=>{if(phase!=='HANDOVER')return;phase='COMPLETE';emit('dispatch-ems-complete',{hospital:data.hospital});},1000);}
function insideHospitalArea(lat,lng){const h=data.hospital;if(!h)return false;const checkpoint=distanceMeters(lat,lng,Number(h.checkpointLat),Number(h.checkpointLng))<=Math.max(10,Number(h.checkpointRadius||h.radius)||40);if(checkpoint)return true;if(!Number.isFinite(Number(h.areaLat))||!Number.isFinite(Number(h.areaLng)))return false;const north=(lat-Number(h.areaLat))*111320,east=(lng-Number(h.areaLng))*111320*Math.cos(rad(Number(h.areaLat))),a=-rad(Number(h.areaRotation)||0),x=east*Math.cos(a)-north*Math.sin(a),y=east*Math.sin(a)+north*Math.cos(a);return Math.abs(x)<=Number(h.areaWidth||0)/2&&Math.abs(y)<=Number(h.areaLength||0)/2;}
window.addEventListener('dispatch-call-started',e=>{if(mode().service==='ems'){phase='TO_SCENE';call=e.detail.call;responseMs=transportMs=0;transportStartedAt=0;arrived=false;}else reset();});
window.addEventListener('dispatch-call-onscene',beginTransport);
window.addEventListener('dispatch-call-cleared',()=>{if(mode().service!=='ems'||phase==='COMPLETE')reset();});
window.addEventListener('dispatch-base-selected',reset);window.addEventListener('city-session-reset',reset);
function tick(){if(phase==='TRANSPORTING'){const v=runtime()?.snapshot?.().vehicle,lat=Number(v?.lat),lng=Number(v?.lon);if(Number.isFinite(lat)&&Number.isFinite(lng)){transportMs=performance.now()-transportStartedAt;if(insideHospitalArea(lat,lng))handover();}}window.setTimeout(tick,250);}
window.__DISPATCH_EMS_TRANSPORT__=Object.freeze({version:VERSION,snapshot:()=>({version:VERSION,phase,callId:call?.id||null,responseMs,transportMs,hospital:data.hospital}),insideHospitalArea,reset});tick();
