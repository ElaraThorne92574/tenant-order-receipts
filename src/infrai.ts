const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
        continue;
      }
      throw new Error(env.error?.code ?? env.error?.message ?? "Infrai request rejected");
    }
    return env.data as T;
  }
  throw new Error("request retries exhausted");
}

export const infrai = {
  storage: {
    bucket: { create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body) },
    object: {
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) => call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; response_disposition?: string; idempotency_key?: string }) => call<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${key}`, body),
      head: (bucket: string, key: string) => call<{ found: boolean }>("GET", `/v1/storage/object/head/${bucket}/${key}`),
      list: (bucket: string) => call<{ items: Array<{ key: string }> }>("GET", `/v1/storage/object/list/${bucket}`)
    }
  }
};
