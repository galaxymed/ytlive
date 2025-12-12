export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  try {
    // 1. Obtener HTML del canal /live
    const html = await fetch(
      `https://www.youtube.com/channel/${id}/live`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    ).then(r => r.text());

    // 2. Extraer el JSON ytInitialData
    const jsonMatch = html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);

    if (!jsonMatch) {
      return res.status(500).send("Cannot parse YouTube page");
    }

    const ytInitialData = JSON.parse(jsonMatch[1]);

    // 3. Buscar el videoId dentro de streamingData
    let videoId = null;

    try {
      videoId =
        ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0]
          .tabRenderer.content.sectionListRenderer.contents[0]
          .itemSectionRenderer.contents[0].videoRenderer.videoId;
    } catch (e) {}

    if (!videoId) {
      return res.status(404).send("Channel is not live");
    }

    // 4. Llamar al endpoint moderno con clientName=WEB
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

    // 5. Redirigir al manifest real
    res.writeHead(302, { Location: hls });
    res.end();

  } catch (err) {
    res.status(500).send("Internal error");
  }
}
