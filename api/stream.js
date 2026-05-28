export default async function handler(req, res) {
  // 1. Pon aquí tu URL exacta de Flussonic sin SSL
  const FLUSSONIC_URL = "http://cdn.cl.scl.edge.01.zplay.cl/Invasiva/tracks-v1a1/mono.ts.m3u8";

  // Configuramos cabeceras CORS globales para evitar bloqueos del reproductor
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Usamos el fetch nativo de Node.js (Sin necesidad de importar librerías externas)
    const response = await fetch(FLUSSONIC_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Flussonic respondió con error: ${response.status}`);
    }

    const text = await response.text();

    // Entregamos el contenido m3u8 de forma segura bajo el HTTPS de Vercel
    res.setHeader('Content-Type', 'application/x-mpegURL');
    return res.status(200).send(text);

  } catch (error) {
    // Evitamos el crash de la función devolviendo el error en texto limpio
    return res.status(502).send(`Error al conectar con Flussonic: ${error.message}`);
  }
}
