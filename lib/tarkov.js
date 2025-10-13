export const config = { runtime: 'edge' };

const TARGET = 'https://api.tarkov.dev/graphql';

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Only POST allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' }
      });
    }

    const body = await req.text();

    const res = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body
    });

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
