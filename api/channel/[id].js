import axios from "axios";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  try {
    // 1. Obtener la página /live del canal
    const html = await axios.get(
      `https://www.youtube.com/channel/${id}/live`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    // 2. Extraer el videoId del stream en vivo
    const match = html.data.match(/"videoId":"(.*?)"/);

    if (!match) {
      return res.status(404).send("Channel is not live");
    }

    const videoId = match[1];

    // 3. Obtener información del video para extraer el manifest HLS
    const info = await axios.get(
      `https://www.youtube.com/get_video_info?video_id=${videoId}&html5=1&c=TVHTML5&cver=7.20190319`
    );

    const params = new URLSearchParams(info.data);
    const playerResponse = JSON.parse(params.get("player_response"));

    const hls = playerResponse?.streamingData?.hlsManifestUrl;

    if (!hls) {
      return res.status(500).send("No HLS manifest found");
    }

    // 4. Redirigir al manifest real
    res.writeHead(302, { Location: hls });
    res.end();

  } catch (err) {
    res.status(500).send("Error resolving stream");
  }
}
