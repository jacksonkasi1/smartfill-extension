import app from '../dist/index.js';

export default async function handler(req, res) {
  // Convert Vercel request to standard Request object
  const url = new URL(req.url || '/', `https://${req.headers.host}`);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  });

  // Get response from Hono app
  const response = await app.fetch(request);
  
  // Convert Response to Vercel response
  const body = await response.text();
  res.status(response.status);
  
  // Set headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  res.send(body);
}