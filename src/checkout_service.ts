import { z } from "zod";
import { infrai } from "./infrai.js";

export const checkoutBody = z.object({ tenantId: z.string().min(1), orderId: z.string().min(1), customerEmail: z.string().email(), totalCents: z.number().int().nonnegative() });
export type Checkout = z.infer<typeof checkoutBody>;

export function receiptKey(order: Checkout): string { return `receipts/${order.orderId}.json`; }

export async function checkout(raw: unknown): Promise<{ orderId: string; receiptKey: string; downloadUrl: string }> {
  const order = checkoutBody.parse(raw);
  const bucket = `tenant-${order.tenantId}`;
  await infrai.storage.bucket.create({ name: bucket });
  const key = receiptKey(order);
  const receipt = Buffer.from(JSON.stringify({ orderId: order.orderId, customerEmail: order.customerEmail, totalCents: order.totalCents })).toString("base64");
  await infrai.storage.object.put(bucket, key, { data_base64: receipt, content_type: "application/json", idempotency_key: `checkout-${order.orderId}` });
  const signed = await infrai.storage.object.presign(bucket, key, { op: "get", expires_seconds: 600, response_disposition: "attachment" });
  return { orderId: order.orderId, receiptKey: key, downloadUrl: signed.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = JSON.parse(process.argv[2] ?? "{}");
  checkout(input).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
