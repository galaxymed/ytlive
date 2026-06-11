process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  const { fix } = req.query;
  
  // Tu URL dinámica o fija apuntando al proxy de Luminous
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

    // 1. REESCRITURA ADAPTATIVA BASE (Igual a la anterior)
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

    // 2. FILTRO EXCLUSIVO PARA CASPARCG (?fix=true)
    // Si es CasparCG, interceptamos la lista master multicalidad y extraemos SOLO la mejor calidad activa
    if (fix === 'true') {
      let targetUrl = null;

      // Buscamos la primera URL de video que aparezca abajo de una etiqueta de calidad (normalmente la mejor va arriba)
      for (let i = 0; i < processedLines.length; i++) {
        let line = processedLines[i].trim();
        // Si la línea contiene la URI de la sub-playlist o es un enlace directo transformado
        if (line && !line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
          targetUrl = line;
          break; // Rompemos el ciclo al encontrar la primera (Máxima Calidad)
        }
      }

      // Si encontramos la sublista de alta calidad, hacemos un segundo fetch invisible para CasparCG
      if (targetUrl) {
        const subResponse = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (subResponse.ok) {
          let subText = await subResponse.text();
          const subUrlBase = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

          // Convertimos los segmentos de la sublista (.ts) en rutas absolutas para CasparCG
          let finalSubText = subText.split('\n').map(subLine => {
            let subTrimmed = subLine.trim();
            if (subTrimmed && !subTrimmed.startsWith('#') && !subTrimmed.startsWith('http://') && !subTrimmed.startsWith('https://')) {
              return subUrlBase + subTrimmed;
            }
            return subLine;
          }).join('\n');

          res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1, stale-while-revalidate=1');
          res.setHeader('Content-Type', 'application/x-mpegURL');
          return res.status(200).send(finalSubText);
        }
      }
    }

    // 3. RESPUESTA NORMAL MULTICALIDAD (Para Web y Apps)
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=2');
    res.setHeader('Content-Type', 'application/x-mpegURL');
    return res.status(200).send(processedLines.join('\n'));

  } catch (error) {
    res.setHeader('Cache-Control', 'public, max-age=3');
    return res.status(502).send(`Error de red proxy: ${error.message}`);
  }
}
