// com.astrobin.iotd

const host = "https://api.nasa.gov";
const apiPath = "planetary/apod";
const apodUrl = "https://apod.nasa.gov/apod/astropix.html"

// Only check every 6 hours
const updateInterval = 6 * 60 * 60 * 1000; // in milliseconds

function load() {
  const authParams = `api_key=${apiKey}`;
  const date = new Date();
  
  let nowTimestamp = (new Date()).getTime();
  
  let doUpdate = true;
  let lastUpdate = getItem("lastUpdate");
  
  if (lastUpdate != null) {
    let lastUpdateTimestamp = parseInt(lastUpdate);
    let futureTimestamp = (lastUpdateTimestamp + updateInterval);
    if (nowTimestamp < futureTimestamp) {
      doUpdate = false;
    }
  }

  if (doUpdate) {
    let apodApiUrl = `${host}/${apiPath}?${authParams}`;

    sendRequest(apodApiUrl)
      .then((apodRawData) => {
        const parsedAPODData = JSON.parse(apodRawData);
        
        const apodInfo = {
            name: parsedAPODData.title || 'N/A',
            author: parsedAPODData.copyright || "Various authors",
            thumbnail: parsedAPODData.media_type === 'image' ? parsedAPODData.url : parsedAPODData.thumbnail_url || '',
            full_res_image: parsedAPODData.hdurl || parsedAPODData.url,
            explanation: parsedAPODData.explanation || 'No explanation available.',
            date: parsedAPODData.date || 'Unknown'
        };
        
        
        const creator = Identity.createWithName(apodInfo.author.trim());    
        const attachment = MediaAttachment.createWithUrl(apodInfo.full_res_image);
        attachment.thumbnail = apodInfo.thumbnail
        attachment.focalPoint = { x: 0, y: 0 };
        
        var resultItem = Item.createWithUriDate("", apodInfo.date);
        resultItem.author = creator;
        resultItem.title = apodInfo.name
        resultItem.body = `<p>${apodInfo.explanation}</p>`;
        resultItem.bodyPreview = '<p>Hi!</p>'
        resultItem.attachments = [attachment];
        
        processResults([resultItem]);
        setItem("lastUpdate", String(nowTimestamp));
      })
      .catch((requestError) => {
        processError(requestError);
      });

  } else {
    processResults(null)
  }
}