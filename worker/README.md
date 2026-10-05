# Worker opcional para CORS

Este Worker es necesario únicamente si el navegador bloquea la petición directa de GitHub Pages a `fmvoley.com`.

Puedes desplegarlo como Cloudflare Worker.

Código recomendado:

```js
export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "no-store, no-cache, max-age=0"
    };

    if (request.method === "OPTIONS") {
      return new Response("", { headers: cors });
    }

    const incoming = new URL(request.url);
    const target = incoming.searchParams.get("url");

    if (!target || !target.startsWith("https://fmvoley.com/")) {
      return new Response("URL FMVB no válida", { status: 400, headers: cors });
    }

    const response = await fetch(target, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, max-age=0",
        "User-Agent": "CalendarioVoleibolMadrid/1.0"
      }
    });

    const headers = new Headers(response.headers);
    Object.entries(cors).forEach(([k,v]) => headers.set(k,v));

    return new Response(response.body, {
      status: response.status,
      headers
    });
  }
};
```

Tras desplegarlo, copia su URL en:

`src/config.js`

por ejemplo:

```js
export const OPTIONAL_PROXY_URL = "https://mi-worker.example.workers.dev";
```

El frontend ya le enviará:

`/?url=https://fmvoley.com/...&_ts=...`

El Worker no debe almacenar el contenido.
