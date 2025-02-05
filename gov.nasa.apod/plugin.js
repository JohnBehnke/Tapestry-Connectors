// gov.nasa.apod

const API_URL = "https://api.nasa.gov/planetary/apod";
const APOD_BASE_URL = "https://apod.nasa.gov/apod/";
const UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function load() {
  loadAsync().then(processResults).catch(processError);
}

async function getAuthorUri(url, targetText) {
  const html = await getData(url);
  const anchorRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    let [_, href, linkText] = match;
    if (linkText.trim() === targetText.trim()) {
      return href;
    }
  }
  return undefined;
}

function getData(url) {
  try {
    return sendRequest(url);
  } catch (requestError) {
    processError(requestError);
  }
}

function getApodDateSuffix(dateString) {
  const [year, month, day] = dateString.split("-");
  return `ap${year.slice(2)}${month}${day}`;
}

async function loadAsync() {
  const authParams = `api_key=${apiKey}`;
  const nowTimestamp = Date.now();

  const lastUpdate = parseInt(getItem("lastUpdate"), 10);
  if (lastUpdate && nowTimestamp < lastUpdate + UPDATE_INTERVAL) {
    return;
  }

  const apodApiUrl = `${API_URL}?${authParams}`;
  const apodJson = JSON.parse(await getData(apodApiUrl));

  const { title, date: postedDateString, url: mediaUrl, explanation, media_type: mediaType, copyright = "Public Domain" } = apodJson;
  const postedDate = new Date(postedDateString);
  
  const embed = mediaType === "image" 
    ? `<img src="${mediaUrl}"/>`
    : `<iframe id="player" type="text/html" width="640" height="390" src="${mediaUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  
  const formattedCopyright = copyright.trim()
  const creator = Identity.createWithName(formattedCopyright);
  const apodDateSuffix = getApodDateSuffix(postedDateString);
  const apodPageUrl = `${APOD_BASE_URL}${apodDateSuffix}.html`;
  
  const resultItem = Item.createWithUriDate(apodPageUrl, postedDate);
  
  if (copyright !== "Public Domain") {
    creator.uri = await getAuthorUri(apodPageUrl, formattedCopyright);
  }
  
  resultItem.author = creator;
  resultItem.title = title;
  resultItem.body = `<p>${embed}${explanation}</p>`;
  
  setItem("lastUpdate", String(nowTimestamp));
  return [resultItem];
}