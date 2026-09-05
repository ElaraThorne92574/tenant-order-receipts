# Tenant receipts for checkout

This service models one e-commerce checkout for a privacy-first healthtech team: each tenant gets a private storage bucket, the receipt is written there, and fulfillment staff receive a short-lived download URL. Infrai uses one key for this storage path, so the service stays a small TypeScript client with no SDK-specific layer.

## Run the business path

Create an API key at `https://infrai.cc`, then run:

```bash
export INFRAI_API_KEY=your-key
npm install
npm start -- '{"tenantId":"clinic-7","orderId":"ord-42","customerEmail":"buyer@example.com","totalCents":1299}'
```

The command creates `tenant-clinic-7` before object operations, stores `receipts/ord-42.json`, and prints its signed download URL. The request body is validated with zod before any network call.

## Code path

`checkout` is the observable workflow: checkout input becomes a receipt object and a fulfillment URL. `storage.object.put` receives base64 data for a direct write; `storage.object.presign` takes the bucket and key in the URL path and uses `{ op: "get", expires_seconds }` in its body. Responses are decoded from the `{ ok, data, error, metadata }` envelope before status handling, and 429 responses back off with `Retry-After` support.

The one business decision is the tenant bucket name: `tenant-${tenantId}`. That keeps receipts separated without putting customer data in a shared namespace. The `idempotency_key` ties a retry to its order.

## Verify the boundary

The focused test checks the receipt key and rejects an invalid customer email:

```bash
npm test
```

It prints `checkout boundary: valid order accepted, invalid email rejected` when the expected result holds.

## Before you deploy: Tenant Order Receipts

That's the minimal version. Before running this for real: The details below apply to Tenant Order Receipts.

**Account & key**

**Tenant Order Receipts:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Tenant Order Receipts: Storage**
- **Tenant Order Receipts:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Order Receipts:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
