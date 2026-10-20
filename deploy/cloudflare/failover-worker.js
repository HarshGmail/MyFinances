const FALLBACK_ORIGINS = {
  'api.my-finances.site': 'https://myfinances-gk1g.onrender.com',
  'mcp.my-finances.site': 'https://mcp-server-myfinances.onrender.com',
};

const HOME_SERVER_UNREACHABLE = new Set([502, 503, 504, 530]);

const SERVED_BY_HEADER = 'x-served-by';

async function fromHomeServer(request, body) {
  try {
    const response = await fetch(new Request(request, { body }));
    return HOME_SERVER_UNREACHABLE.has(response.status) ? null : response;
  } catch {
    return null;
  }
}

function fromRender(request, body, origin) {
  const url = new URL(request.url);
  return fetch(new URL(url.pathname + url.search, origin), {
    method: request.method,
    headers: request.headers,
    body,
    redirect: 'manual',
  });
}

function markServedBy(response, server) {
  const marked = new Response(response.body, response);
  marked.headers.set(SERVED_BY_HEADER, server);
  return marked;
}

export default {
  async fetch(request) {
    const origin = FALLBACK_ORIGINS[new URL(request.url).hostname];
    if (!origin) return fetch(request);

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const body = hasBody ? await request.arrayBuffer() : undefined;

    const home = await fromHomeServer(request, body);
    if (home) return markServedBy(home, 'pingu');
    return markServedBy(await fromRender(request, body, origin), 'render');
  },
};
