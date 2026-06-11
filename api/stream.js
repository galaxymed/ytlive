// Forzamos a Node.js a omitir errores de certificados SSL inválidos del origen
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  const FLUSSONIC_URL = "https://cdn.cl.scl.edge.01.zplay.cl/Invasiva/tracks-v1a1/mono.m3u8";

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(FLUSSONIC_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Error de origen: ${response.status}`);
    }

    let text = await response.text();

    // OBTENER LA BASE DE LA URL (Ej: https://zplay.cl)
    const urlBase = FLUSSONIC_URL.substring(0, FLUSSONIC_URL.lastIndexOf('/') + 1);

    // REESCRITURA: Si los segmentos no empiezan con http o https, les inyectamos la URL base
    text = text.split('\n').map(line => {
      const trimmed = line.trim();
      // Si la línea no es un comentario de HLS (#) y no empieza con http, es una ruta relativa
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return urlBase + trimmed;
      }
      return line;
    }).join('\n');

    res.setHeader('Content-Type', 'application/x-mpegURL');
    return res.status(200).send(text);

  } catch (error) {
    return res.status(502).send(`Error de conexión: ${error.message}`);
  }
}
