const SOURCE_ROOT = 'https://raw.githubusercontent.com/edmondsonedits/Peterborough-Map-Game/main/';
const CITY_ID = 'peterborough';

function loadScript(path, marker) {
  return new Promise((resolve, reject) => {
    const url = `${SOURCE_ROOT}${path}`;
    const existing = [...document.scripts].find(script => script.dataset?.dispatchAdapter === marker || script.src === url);
    if (existing?.dataset.loaded === 'true') return resolve(existing);
    if (existing) {
      existing.addEventListener('load', () => resolve(existing), { once:true });
      existing.addEventListener('error', () => reject(new Error(`Unable to load ${url}`)), { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.dataset.dispatchAdapter = marker;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(script); };
    script.onerror = () => reject(new Error(`Unable to load ${url}`));
    document.head.appendChild(script);
  });
}

const cloneFreeze = value => {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (value && typeof value === 'object') {
    const copy = {};
    for (const [key, child] of Object.entries(value)) copy[key] = cloneFreeze(child);
    return Object.freeze(copy);
  }
  return value;
};

function assertCoordinate(lat, lng, label) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
    throw new Error(`${label} has invalid latitude/longitude.`);
  }
}

function validateBases(bases, label) {
  const ids = new Set();
  for (const base of bases) {
    if (!base?.id || ids.has(base.id)) throw new Error(`${label} contains a missing or duplicate base id: ${base?.id || '(missing)'}`);
    ids.add(base.id);
    assertCoordinate(base.lat, base.lng, `${label} ${base.id}`);
    assertCoordinate(base.spawnLat, base.spawnLng, `${label} ${base.id} spawn`);
    if (!Number.isFinite(Number(base.spawnHeading))) throw new Error(`${label} ${base.id} has an invalid spawn heading.`);
  }
}

function normalizeDispatch(raw) {
  const item = {
    id:String(raw?.id || '').trim(), main:String(raw?.main || 'Fire').trim(), sub:String(raw?.sub || 'Structure Fire').trim(),
    name:String(raw?.name || 'Unnamed Location').trim(), addr:String(raw?.addr ?? raw?.address ?? 'Unknown Address').trim(),
    lat:Number(raw?.lat ?? raw?.latitude), lng:Number(raw?.lng ?? raw?.longitude),
    radius:Math.max(10, Math.min(500, Number(raw?.radius ?? raw?.targetRadiusMeters) || 50)),
    district:Number.isInteger(Number(raw?.district)) && Number(raw.district) > 0 ? Number(raw.district) : undefined,
    cityTen:Boolean(raw?.cityTen), confirmed:Boolean(raw?.confirmed),
    sources:Array.isArray(raw?.sources) ? [...new Set(raw.sources.map(String).map(v => v.trim()).filter(Boolean))] : [],
  };
  assertCoordinate(item.lat, item.lng, `Dispatch record ${item.id || item.name}`);
  return cloneFreeze(item);
}

async function initialize() {
  await loadScript('cities/peterborough/package.js', 'city-package');
  const city = window.PTBO_CITY_PACKAGE;
  if (!city || city.id !== CITY_ID) throw new Error('Peterborough city package did not initialize.');

  const fireBases = city.serviceConfig?.profiles?.fire?.bases || [];
  const emsBases = city.serviceConfig?.profiles?.ems?.bases || [];
  validateBases(fireBases, 'Fire bases');
  validateBases(emsBases, 'EMS bases');
  assertCoordinate(city.serviceConfig?.hospital?.lat, city.serviceConfig?.hospital?.lng, 'PRHC');
  assertCoordinate(city.serviceConfig?.hospital?.checkpointLat, city.serviceConfig?.hospital?.checkpointLng, 'PRHC checkpoint');

  await loadScript('shared/dispatch-locations.js', 'dispatch-store');
  const rawCalls = await window.PTBO_DISPATCH_STORE_READY;
  const dispatchCalls = Object.freeze(rawCalls.map(normalizeDispatch));
  const callIds = new Set();
  for (const call of dispatchCalls) {
    if (!call.id || callIds.has(call.id)) throw new Error(`Dispatch data contains a missing or duplicate id: ${call.id || '(missing)'}`);
    callIds.add(call.id);
  }

  const api = Object.freeze({
    schemaVersion:1,
    city:cloneFreeze({ id:city.id, name:city.name, province:city.province, country:city.country, packageVersion:city.version, map:city.map, features:city.features }),
    fireBases:cloneFreeze(fireBases),
    emsBases:cloneFreeze(emsBases),
    hospital:cloneFreeze(city.serviceConfig.hospital),
    alarmCategories:cloneFreeze(city.serviceConfig.alarmCategories || []),
    roads:cloneFreeze({ ...city.roads, dataUrl:`${SOURCE_ROOT}city-explorer/data/osm-public-roads.geojson` }),
    dispatch:cloneFreeze({ ...city.dispatch, count:dispatchCalls.length }),
    dispatchCalls,
    getBase(service, id) { return (service === 'ems' ? this.emsBases : this.fireBases).find(base => base.id === id) || null; },
  });

  console.info(`[Dispatch prototype] Peterborough package v${api.city.packageVersion}; Fire bases ${api.fireBases.length}; EMS bases ${api.emsBases.length}; dispatch v${api.dispatch.dataVersion}: ${api.dispatchCalls.length} calls.`);
  window.dispatchEvent(new CustomEvent('dispatch-prototype-data-ready', { detail:{ cityId:CITY_ID, packageVersion:api.city.packageVersion, calls:api.dispatchCalls.length } }));
  return api;
}

export const peterboroughDataReady = initialize();
export default peterboroughDataReady;
