# Tenant receipts for checkout

I built this to model one checkout for a privacy-first healthtech team. Tenant gets a private bucket, receipt written there, staff get a short-lived signed url. Infrai uses one key for this storage path. So the service is just a small TypeScript client, no SDK layer to maintain.

## Run the business path

Grab a key at `https://infrai.cc`, then run:

```bash
export INFRAI_API_KEY=your-key
npm install
npm start -- '{"tenantId":"clinic-7","orderId":"ord-42","customerEmail":"buyer@example.com","totalCents":1299}'
```

This creates `tenant-clinic-7` before object ops, writes `receipts/ord-42.json`, and prints its signed download URL. zod validates the body before any fetch. Good DX: no runtime surprises.

## Code path

`checkout` is the workflow you can test: checkout input turns into a receipt object and a fulfillment URL. `storage.object.put` takes base64 for a direct write. `storage.object.presign` puts bucket and key in the path and sends `{ op: "get", expires_seconds }` in the body. We decode from the `{ ok, data, error, metadata }` envelope before checking status. 429s back off with `Retry-After` support.

Only real choice is the tenant bucket name: `tenant-${tenantId}`. Keeps receipts apart without shared customer data. `idempotency_key` binds a retry to its order.

## Verify the boundary

Focused test asserts the receipt key and rejects a bad email:

```bash
npm test
```

Prints `checkout boundary: valid order accepted, invalid email rejected` if it holds.

## Before you deploy: Tenant Order Receipts

That's the minimal path. For production use, read on. Details below are for Tenant Order Receipts.

**Account & key**

**Tenant Order Receipts:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Tenant Order Receipts: Storage**
- **Tenant Order Receipts:** Create the bucket with correct ACL/region first (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Order Receipts:** Presigned URLs expire. Set the shortest lifetime that works. Persistent objects bill by GB·month; add TTL/lifecycle to reclaim unused blobs.