// org.open-notify.iss-location

const API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const WEB_URL = "https://wheretheiss.at"

function load() {
  loadAsync().then(processResults).catch(processError);
}

function getMapsUrl(longitude, latitude) {
  const mapUrls = {
    "Apple Maps": `https://maps.apple.com/?ll=${latitude},${longitude}&z=8`,
    "Google Maps": `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&z=8`,
    "OpenStreetMap": `https://www.openstreetmap.org/?#map=11/${latitude}/${longitude}`,
  };

  return mapUrls[maps_choice] || mapUrls["Apple Maps"];
}

async function reverseGeocode(longitude, latitude) {
  try {
    const response = await getData(
      `https://nominatim.openstreetmap.org/reverse.php?lat=${latitude}&lon=${longitude}&format=jsonv2`
    );
    const data = JSON.parse(response);
    return data?.display_name || undefined;
  } catch (error) {
    throw new Error("Reverse geocoding for ISS location failed with:", error)
  }
}

function getData(url) {
  try {
    return sendRequest(url);
  } catch (requestError) {
    processError(requestError);
  }
}

function correctVelocityUnits(velocity) {
  const velocityFloat = parseFloat(velocity);
  let correctedUnits = units == "km/h" ? velocityFloat : (velocityFloat * 0.621371);
  return correctedUnits.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function oceanLocationEstimate(longitude, latitude) {
  // Pacific Ocean
  if (
    longitude >= 100 || longitude <= -70 || 
    (latitude < 10 && longitude > -150 && longitude < -70)
  ) {
    return "Pacific Ocean";
  }

  // Atlantic Ocean
  if (
    longitude >= -70 && longitude <= 20 && 
    latitude >= -60 && latitude <= 70
  ) {
    return "Atlantic Ocean";
  }

  // Indian Ocean
  if (
    longitude >= 20 && longitude <= 146 && 
    latitude >= -60 && latitude <= 30
  ) {
    return "Indian Ocean";
  }

  // Southern Ocean
  if (latitude < -60) {
    return "Southern Ocean";
  }

  // Arctic Ocean
  if (latitude > 70) {
    return "Arctic Ocean";
  }

  // Default case: Unknown land or sea
  return "Lands Unknown";
}

async function loadAsync() {
  
  const nowTimestamp = Date.now();
  
  const updateIntervals = {
    "1 minute": 1 * 60 * 1000,
    "5 minutes": 5 * 60 * 1000,
    "10 minutes": 10 * 60 * 1000,
    "30 minutes": 30 * 60 * 1000,
    "1 hour": 60 * 60 * 1000
  };

  const selectedInterval = updateIntervals[update_interval] || "10 minutes";
  
  const lastUpdate = parseInt(getItem("lastUpdate"), 10);
  
  if (lastUpdate && nowTimestamp < lastUpdate + selectedInterval) {
    return;
  }

  try {
    const response = await getData(API_URL);
    const issLocationJson = JSON.parse(response);
  
    const {
      latitude,
      longitude,
      velocity,
      timestamp,
    } = issLocationJson;
  
    const mapsUrl = getMapsUrl(longitude, latitude, maps_choice);
    const geocodedLocation = await reverseGeocode(longitude, latitude);
    const approximateLocation = oceanLocationEstimate(longitude, latitude);
    const velocityFormatted = correctVelocityUnits(parseFloat(velocity));
  
    const content = geocodedLocation
      ? `<p><b>Near</b> ${geocodedLocation}<br><b>Going</b> ${velocityFormatted} ${units}<br><a href="${mapsUrl}">Open Map</a></p>`
      : `<p><b>Somewhere over the</b> ${approximateLocation}<br><b>Going</b> ${velocityFormatted} ${units}<br><a href="${mapsUrl}">Open Map</a></p>`;
  
    let resultItem = Item.createWithUriDate(`${WEB_URL}?t=${timestamp}`, timestamp * 1000);
    resultItem.body = content;
  
    setItem("lastUpdate", String(nowTimestamp));
    return [resultItem];
  } catch (error) {
    console.error("Error loading ISS data:", error);
    throw new Error("Invalid ISS Location response structure");
  }
  
}