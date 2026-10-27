-- Orders placed without a customer record (guest checkouts on Shopify) join the customer with the
-- same email, or else the same phone. Anyone left gets a record made from their latest order, so
-- every buyer appears under Customers with all of their orders.
UPDATE orders SET customer_id = (SELECT id FROM customers WHERE customers.email = lower(orders.email))
WHERE customer_id IS NULL AND email IS NOT NULL;
--> statement-breakpoint
UPDATE orders SET customer_id = (SELECT id FROM customers WHERE customers.phone = orders.phone ORDER BY id LIMIT 1)
WHERE customer_id IS NULL AND phone IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO customers (name, email, phone, address1, city, created_at, updated_at)
SELECT o.name,
  CASE WHEN o.email IS NULL OR EXISTS (SELECT 1 FROM customers c WHERE c.email = lower(o.email)) THEN NULL ELSE lower(o.email) END,
  o.phone, o.address1, o.city,
  (SELECT MIN(created_at) FROM orders o2 WHERE o2.phone = o.phone),
  unixepoch()
FROM orders o
WHERE o.id IN (SELECT MAX(id) FROM orders WHERE customer_id IS NULL AND phone IS NOT NULL GROUP BY phone);
--> statement-breakpoint
UPDATE orders SET customer_id = (SELECT id FROM customers WHERE customers.phone = orders.phone ORDER BY id LIMIT 1)
WHERE customer_id IS NULL AND phone IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO customers (name, email, address1, city, created_at, updated_at)
SELECT o.name, lower(o.email), o.address1, o.city,
  (SELECT MIN(created_at) FROM orders o2 WHERE lower(o2.email) = lower(o.email)),
  unixepoch()
FROM orders o
WHERE o.id IN (SELECT MAX(id) FROM orders WHERE customer_id IS NULL AND phone IS NULL AND email IS NOT NULL GROUP BY lower(email));
--> statement-breakpoint
UPDATE orders SET customer_id = (SELECT id FROM customers WHERE customers.email = lower(orders.email))
WHERE customer_id IS NULL AND email IS NOT NULL;
