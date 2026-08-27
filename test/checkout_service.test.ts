import assert from "node:assert/strict";
import { checkoutBody, receiptKey } from "../src/checkout_service.js";

const order = { tenantId: "clinic-7", orderId: "ord-42", customerEmail: "buyer@example.com", totalCents: 1299 };
assert.equal(receiptKey(order), "receipts/ord-42.json");
assert.deepEqual(checkoutBody.parse(order), order);
assert.throws(() => checkoutBody.parse({ ...order, customerEmail: "bad" }));
console.log("checkout boundary: valid order accepted, invalid email rejected");
