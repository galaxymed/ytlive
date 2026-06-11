process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  // Tu URL Master única que cambiarás cuando quieras
  const FLUSSONIC_URL = "https://cdn.cl.scl.edge.01.zplay.cl/Invasiva/index.m3u8";

  // 1. Cabeceras CORS robustas para que funcione en cualquier web, app o Smart TV
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); 

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(FLUSSONIC_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) {
      // Si tu Flussonic se cae, le decimos a Vercel que cachee el error por 5 segundos.
      // Esto evita que 5,000 usuarios reintentando al mismo tiempo tiren tu servidor Vercel.
      res.setHeader('Cache-Control', 'public, max-age=5');
      return res.status(response.status).send(`Error de origen: ${response.status}`);
    }

    let text = await response.text();
    const urlBase = FLUSSONIC_URL.substring(0, FLUSSONIC_URL.lastIndexOf('/') + 1);

    // Reescritura adaptativa de rutas relativas a absolutas
    text = text.split('\n').map(line => {
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
    }).join('\n');

    // 2. Control de Caché en el Edge: Entrega ultrarrápida a miles de usuarios simultáneos
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=2');
    res.setHeader('Content-Type', 'application/x-mpegURL');
    
    return res.status(200).send(text);

  } catch (error) {
    res.setHeader('Cache-Control', 'public, max-age=5');
    return res.status(502).send(`Error de conexión: ${error.message}`);
  }
}
