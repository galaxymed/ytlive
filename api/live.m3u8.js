process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  const { fix } = req.query;

  // 1. Definimos las dos URLs
  const PRIMARY_URL = "https://eu.luminous.dev/live/nanduti1021";
  const SECONDARY_URL = "https://video.wilohosting.com:19360/invasivatv/invasivatv.m3u8"; // <-- Reemplaza con tu URL secundaria

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Función auxiliar para intentar descargar la lista
  async function fetchStream(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    return { text, activeUrl: url };
  }

  try {
    let streamData;

    // 2. Intentar primero con la URL Principal
    try {
      streamData = await fetchStream(PRIMARY_URL);
    } catch (primaryError) {
      console.warn(`Falló la URL principal (${PRIMARY_URL}). Intentando con la secundaria...`, primaryError.message);
      
      // 3. Si falla, intentar con la Secundaria
      streamData = await fetchStream(SECONDARY_URL);
    }

    const { text, activeUrl } = streamData;

    // Calculamos el urlBase dinámicamente según la URL que funcionó
    const urlBase = activeUrl.substring(0, activeUrl.lastIndexOf('/') + 1);

    // 4. Formateamos las líneas a rutas absolutas
    let lines = text.split('\n');
    let processedLines = lines.map(line => {
      let trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return urlBase + trimmed;
      }
      if (trimmed && trimmed.startsWith('#EXT-X-STREAM-INF') && trimmed.includes('URI=')) {
        // En caso de que haya URIs dentro de las etiquetas de Flussonic/HLS
        return trimmed.replace(/URI="([^"]+)"/, (match, p1) => {
          if (!p1.startsWith('http://') && !p1.startsWith('https://')) {
            return `URI="${urlBase}${p1}"`;
          }
          return match;
        });
      }
      return line;
    });

    // Configuramos el header para que sea interpretado como M3U8
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(processedLines.join('\n'));

  } catch (finalError) {
    // Si ambas fallaron o hubo un problema grave
    console.error('Ambas fuentes M3U8 fallaron:', finalError.message);
    res.setHeader('Cache-Control', 'public, max-age=3');
    return res.status(502).send('Error: Ninguna de las fuentes M3U8 está disponible.');
  }
                                     }
