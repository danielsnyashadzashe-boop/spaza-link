# SpazaLink: brief compliance test report

Run on 26 October 2026 at 19:33 against http://localhost:3000.

**80 of 80 checks passed.** Every check calls the live app, which reads and writes MongoDB Atlas and verifies Clerk sessions. Nothing is mocked.


## 8. User journey, step 1: Sign up and register a shop

| Check | Result | Evidence |
|---|---|---|
| A brand new user sees Thandi's demo shop by default | Pass |  |
| The demo shop is view only for them until they register | Pass |  |
| Shop registration is saved | Pass | 201 |
| Dashboard loads the new shop | Pass |  |
| Their own shop starts clean: no demo stock or orders mixed in | Pass |  |
| They can still look at the demo shop on purpose | Pass |  |
| Compliance score reads low at sign up (profile only) | Pass | 15% |
| The admin portal sees the newly registered shop | Pass |  |

## 3. Screen 1: Inventory Dashboard

| Check | Result | Evidence |
|---|---|---|
| Document upload area accepts a CIPC PDF | Pass | 201 |
| Document upload area accepts a BEE image (PNG) | Pass | 201 |
| Compliance Score widget climbs to 85% Ready with CIPC and BEE | Pass | 85% |
| Deleting a document changes the score immediately | Pass | 50% |
| Stock list: add an item | Pass |  |
| A full shelf shows Green | Pass | 12/12 |
| Colour thresholds: 58% is Green (over 50%) | Pass | green |
| Colour thresholds: 50% is Yellow (20% to 50%) | Pass | yellow |
| Colour thresholds: 25% is Yellow | Pass | yellow |
| Low stock alert: 17% drops into Red (under 20%) | Pass | red |
| Stock list: edit full capacity recalculates the colour | Pass |  |
| Quick Fix: the red item links to a verified catalogue product | Pass | Ubuntu Cash & Carry |

## 4. Screen 2: Ordering and Checkout

| Check | Result | Evidence |
|---|---|---|
| Product catalogue: every listed product shows a trust badge | Pass |  |
| Product catalogue: every listed supplier is a Verified Supplier | Pass |  |
| Unverified products are not listed | Pass | 3 hidden |
| No order without a payment method | Pass |  |
| PayShap uses the phone number (an invalid one is refused) | Pass |  |
| Quick Fix order for the missing quantity is created | Pass | 10 units |
| Cart: bulk discount shown as its own line | Pass | discount 38.99 |
| Payment choice saved on the order | Pass |  |
| Cash on Delivery stays pending until delivered | Pass |  |
| Delivery timeline starts at Order Placed | Pass |  |
| Status update moves the timeline to packing | Pass |  |
| Status update moves the timeline to out for delivery | Pass |  |
| Status update moves the timeline to delivered | Pass |  |
| Delivery puts the stock back on the shelf (Red to Green) | Pass | 12/12 |
| Order status can also be changed by the admin (wholesaler stand in) | Pass |  |

## 5. Screen 3: Financial Portal

| Check | Result | Evidence |
|---|---|---|
| Simple spend chart: six months of points | Pass |  |
| A new order changes the current month's point | Pass | 870.89 = 870.89 |
| Scorecard: Total Money Spent matches the order history exactly | Pass |  |
| Scorecard: On Time Payments matches the payment history | Pass | 100% |
| Scorecard: Credit Health Status is Good, Fair or At Risk | Pass | Fair |
| Demo shop has a full trading record (six active months, Good credit) | Pass | Good 93 |
| PDF download button returns a real PDF | Pass |  |
| The same report downloads as PowerPoint | Pass |  |
| Report download requires a session | Pass |  |

## 6. Security features and SSDL

| Check | Result | Evidence |
|---|---|---|
| RLS: Shop B cannot read Shop A's order | Pass |  |
| RLS: Shop B cannot download Shop A's documents | Pass |  |
| RLS: a test login as Shop B returns none of Shop A's rows | Pass |  |
| Authentication required on /dashboard | Pass | 307 |
| Authentication required on /order | Pass | 307 |
| Authentication required on /finance | Pass | 307 |
| Authentication required on /onboarding | Pass | 307 |
| Authentication required on /admin | Pass | 307 |
| / is open without signing in | Pass | Clerk dev handshake |
| /sign-in is open without signing in | Pass | Clerk dev handshake |
| /sign-up is open without signing in | Pass | Clerk dev handshake |
| Server side input validation rejects bad input | Pass |  |
| Upload filter: a .exe is refused | Pass |  |
| Upload filter: a renamed .exe is refused | Pass |  |
| Upload filter: a 6 MB PDF is refused | Pass |  |
| Passwords are handled by Clerk, never stored by SpazaLink | Pass |  |
| A shop owner is refused the admin portal (roles) | Pass |  |
| API keys and secrets live in environment variables only | Pass | none in source |

## 7. Technical architecture and database plan

| Check | Result | Evidence |
|---|---|---|
| Collection shops exists and holds data | Pass | 11 documents |
| Collection compliance_documents exists and holds data | Pass | 16 documents |
| Collection suppliers exists and holds data | Pass | 7 documents |
| Collection products exists and holds data | Pass | 179 documents |
| Collection stock_items exists and holds data | Pass | 287 documents |
| Collection orders exists and holds data | Pass | 145 documents |
| Collection order_items exists and holds data | Pass | 499 documents |
| Collection order_status_events exists and holds data | Pass | 552 documents |
| Collection payments exists and holds data | Pass | 145 documents |

## 10. Demo account and preloaded data

| Check | Result | Evidence |
|---|---|---|
| Demo shop has stock in all three colours | Pass | yellow, red, green |
| Demo shop has past orders | Pass | 20 shown |
| Demo shop has CIPC and BEE sample files | Pass |  |
| Second demo shop exists to show the data walls | Pass |  |

## Admin portal

| Check | Result | Evidence |
|---|---|---|
| Overview graphs have data (monthly, status, payments, products, categories) | Pass |  |
| Registrations are visible (new shops per month and newest shops) | Pass |  |
| Platform report downloads as PDF | Pass |  |
| Platform report downloads as PowerPoint | Pass |  |
| Shop owners cannot download the platform report | Pass |  |

Reproduce with `npm run build && npm start`, then `npm run test:brief`.
