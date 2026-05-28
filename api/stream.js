import fetch from 'node-fetch';

export default async function handler(req, res) {
  // URL de tu Flussonic sin SSL
  const FLUSSONIC_URL = "http://cdn.cl.scl.edge.01.zplay.cl/Invasiva/tracks-v1a1/mono.ts.m3u8";

  try {
    const response = await fetch(FLUSSONIC_URL);
    const text = await response.text();

    // Habilitar CORS y entregar el m3u8 de forma segura bajo el HTTPS de Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.status(200).send(text);
  } catch (error) {
    res.status(500).send("Error de conexión con Flussonic");
  }
}
