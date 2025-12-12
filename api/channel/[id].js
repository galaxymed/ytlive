export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing channel ID");
  }

  // URL del manifest HLS de YouTube
  const manifestUrl = `https://manifest.googlevideo.com/api/manifest/hls_variant/expire/9999999/id/${id}.m3u8`;

  // Redirigir al cliente al manifest real
  res.writeHead(302, { Location: manifestUrl });
  res.end();
}
