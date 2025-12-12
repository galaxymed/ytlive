export default function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  const hlsUrl = `https://manifest.googlevideo.com/api/manifest/hls_variant/expire/9999999/id/${id}.m3u8`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.status(200).send(hlsUrl);
}
