export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  try {
    // 1. Obtener información del canal usando youtubei/v1/browse
    const browse = await fetch(
      "https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          browseId: id,
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240201.01.00"
            }
          }
        })
      }
    ).then(r => r.json());

    // 2. Buscar el videoId del LIVE
    let videoId = null;

    try {
      const tabs = browse.contents.twoColumnBrowseResultsRenderer.tabs;

      for (const tab of tabs) {
        const content = tab?.tabRenderer?.content;
        const sections = content?.sectionListRenderer?.contents;

        if (!sections) continue;

        for (const section of sections) {
          const items = section?.itemSectionRenderer?.contents;
          if (!items) continue;

          for (const item of items) {
            const live = item?.videoRenderer;
            if (live?.badges?.some(b => b.metadataBadgeRenderer?.label === "LIVE")) {
              videoId = live.videoId;
            }
          }
        }
      }
    } catch (e) {}

    if (!videoId) {
      return res.status(404).send("Channel is not live");
    }

    // 3. Obtener el manifest HLS real
    const player = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240201.01.00"
            }
          }
        })
      }
    ).then(r => r.json());

    const hls = player?.streamingData?.hlsManifestUrl;

    if (!hls) {
      return res.status(500).send("No HLS manifest found");
    }

    // 4. Redirigir al manifest real
    res.writeHead(302, { Location: hls });
    res.end();

  } catch (err) {
    res.status(500).send("Internal error");
  }
}
