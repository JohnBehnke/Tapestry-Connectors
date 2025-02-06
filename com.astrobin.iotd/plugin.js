// com.astrobin.iotd

const HOST = "https://astrobin.com";
const API_URL = `${HOST}/api/v1`;
const UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function load() {
  loadAsync().then(processResults).catch(processError);
}

async function getData(url) {
  try {
    return await sendRequest(url);
  } catch (error) {
    processError(error);
  }
}

async function loadAsync() {
  const authParams = `api_key=${apiKey}&api_secret=${apiSecret}`;
  const nowTimestamp = Date.now();

  const lastUpdate = parseInt(getItem("lastUpdate"), 10);
  if (lastUpdate && nowTimestamp < lastUpdate + UPDATE_INTERVAL) {
    return;
  }

  const iotdUrl = `${API_URL}/imageoftheday?limit=1&${authParams}&format=json`;
  const iotdJson = JSON.parse(await getData(iotdUrl));
  
  if (!iotdJson.objects.length) {
    throw new Error("No Astrobin Image of the Day (IOTD) found.");
  }

  const iotdInfo = iotdJson.objects[0];
  const { image: imageAPIPath, date: iotdDateString } = iotdInfo;
  const iotdDate = new Date(iotdDateString);
  const imageApiUrl = `${HOST}${imageAPIPath}?${authParams}&format=json`;

  const imageJson = JSON.parse(await getData(imageApiUrl));
  const { url_hd: imageUrl, w: imageWidth, h: imageHeight, hash: imageHash, user, title, description, likes, views } = imageJson;
  const iotdUri = `${HOST}/${imageHash}`;
  
  const safeDescription = (description === null || description === "null" || description === undefined) ? undefined : description;
  
  const userUrl = `${API_URL}/userprofile?username=${user}&${authParams}&format=json`;
  const userJson = JSON.parse(await getData(userUrl));

  if (!userJson.objects.length) {
    throw new Error(`Astrobin user profile not found for ${user}`);
  }

  const { username, real_name: creatorName, avatar } = userJson.objects[0];
  const creatorUrl = `${HOST}/users/${username}/`;

  const creator = Identity.createWithName(creatorName);
  creator.uri = creatorUrl;
  creator.avatar = avatar;

  const attachment = MediaAttachment.createWithUrl(imageUrl);
  attachment.aspectSize = { width: imageWidth, height: imageHeight };
  attachment.focalPoint = { x: 0, y: 0 };

  const likesAnnotation = Annotation.createWithText(`Likes: ${likes}`);
  const viewsAnnotation = Annotation.createWithText(`Views: ${views}`);
  
  const resultItem = Item.createWithUriDate(iotdUri, iotdDate);
  resultItem.author = creator;
  resultItem.title = title;
  
  if (safeDescription) {
    resultItem.body = `<p>${description}</p>`;
  }
  resultItem.attachments = [attachment];
  resultItem.annotations = [likesAnnotation, viewsAnnotation];

  return [resultItem];
  setItem("lastUpdate", String(nowTimestamp));
}