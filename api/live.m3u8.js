process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  const { fix } = req.query;
  const FLUSSONIC_URL = "https://eu.luminous.dev/live/nanduti1020";

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(FLUSSONIC_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) {
      res.setHeader('Cache-Control', 'public, max-age=3');
      return res.status(response.status).send(`Error de Luminous: ${response.status}`);
    }

    let text = await response.text();
    const urlBase = FLUSSONIC_URL.substring(0, FLUSSONIC_URL.lastIndexOf('/') + 1);

    // Formateamos las líneas a rutas absolutas
    let lines = text.split('\n');
    let processedLines = lines.map(line => {
      let trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return urlBase + trimmed;
      }
      if (trimmed && trimmed.startsWith('#EXT-X-STREAM-INF') && trimmed.includes('URI=')) {
        return line.replace(/URI="([^"]+)"/, (match, p1) => {
          if (!p1.startsWith('http://') && !p1.startsWith('https://')) {
            return `URI="${urlBase}${p1}"`;
          }
          return match;
        });
      }
      return line;
    });

    // MODALIDAD REDIRECCIÓN DIRECTA PARA CASPARCG (?fix=true)
    if (fix === 'true') {
      let targetUrl = null;
      // Extraemos la primera sub-playlist (Máxima calidad)
      for (let i = 0; i < processedLines.length; i++) {
        let line = processedLines[i].trim();
        if (line && !line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
          targetUrl = line;
          break;
        }
      }

      if (targetUrl) {
        // En lugar de hacer otro fetch que Node.js pueda romper, 
        // le hacemos una redirección HTTP 302 directa a CasparCG. 
        // FFmpeg procesa las redirecciones de forma nativa e impecable.
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        return res.redirect(302, targetUrl);
      }
    }

    // RESPUESTA ADAPTATIVA (Para Web y Apps)
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=2');
    res.setHeader('Content-Type', 'application/x-mpegURL');
    return res.status(200).send(processedLines.join('\n'));

  } catch (error) {
    res.setHeader('Cache-Control', 'public, max-age=3');
    return res.status(502).send(`Error: ${error.message}`);
  }
}
