export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  try {
    // 1. Buscar el live usando youtubei/v1/search
    const search = await fetch(
      "https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          query: `${id} live`,
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240201.01.00"
            }
          }
        })
      }
    ).then(r => r.json());

    // 2. Buscar un videoRenderer con badge LIVE
    let videoId = null;

    const contents =
      search.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (!vr) continue;

        const badges = vr.badges || [];
        const isLive = badges.some(
          b => b.metadataBadgeRenderer?.label === "LIVE"
        );

        if (isLive) {
          videoId = vr.videoId;
        }
      }
    }

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
