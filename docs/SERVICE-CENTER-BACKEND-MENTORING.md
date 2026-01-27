# Service Center Dashboard – Backend mentoring guide

This doc explains how this codebase is structured, how the Service Center APIs fit in, and how we’ll implement them step by step so you can learn the pattern.

---

## 1. How this backend is structured (the pattern)

Every feature follows the same flow:

```
HTTP request
    → app.ts (mounts a router under /api/v1/...)
    → routes/*.routes.ts (path + method → controller function)
    → controllers/*.controller.ts (read params/query/body, use db, send response)
    → models (Sequelize: tables and associations in models/index.ts)
```

### 1.1 Routes (`src/routes/`)

- One file per domain (e.g. `servicePark.routes.ts`, `dashboard.routes.ts`).
- Uses `express.Router()`.
- Imports controller functions and binds them to method + path:
  - `router.get("/path", controllerFn)`
  - `router.post("/path", controllerFn)`
  - `router.put("/path/:id", controllerFn)`
  - `router.delete("/path/:id", controllerFn)`
- Exports the router as `export default router`.

### 1.2 Controllers (`src/controllers/`)

- One file per domain.
- Each handler is `async (req: Request, res: Response) => {...}`.
- Responsibilities:
  - Read `req.params`, `req.query`, `req.body`.
  - Validate (e.g. required `branchId`, `date` in YYYY-MM-DD).
  - Use `db` (e.g. `ServiceParkBooking.findAll(...)`).
  - Send `res.status(http.OK).json(...)` or error `res.status(http.BAD_REQUEST).json({ message, ... })`.
- They use `http-status-codes` (imported as `http`) for status codes.
- No “business logic” layer in this project – logic lives in the controller (and sometimes in helpers in the same file).

### 1.3 Models (`src/models/`)

- One file per table (e.g. `serviceParkBooking.model.ts`).
- Define columns and types; associations are in `models/index.ts`.
- Controllers import `db` from `"../models"` and use `db.ServiceParkBooking`, `db.Customer`, etc.

### 1.4 App (`src/app.ts`)

- Mounts each router under a base path, e.g.:
  - `app.use("/api/v1/service-park", serviceParkRoutes);`
  - So `servicePark.routes.ts`’s `router.get("/branches/:id", ...)` becomes **GET /api/v1/service-park/branches/:id**.

---

## 2. What the frontend needs (from the spec)

| # | Spec route | Purpose | Backend action |
|---|------------|---------|----------------|
| 1 | GET `/service-center/service-types` | Dropdown: service types | Implemented under `/api/v1/service-center`. |
| 2 | GET `/service-park/branches/:branchId/lines` | Dropdown: service lines for a branch | **Already implemented** – test to confirm shape (see §6). |
| 3 | GET `/service-center/dashboard/stats` | Dashboard cards (totalScheduled, etc.) | **Reuse** – frontend gets these from the existing dashboard/other page; no new route. |
| 4 | GET `/service-center/bookings` | List bookings for a day (with filters) | To implement. |
| 5 | GET `/service-center/bookings/:id` | Single booking for modal/edit | To implement. |
| 6 | ~~GET `/service-center/calendar-dots`~~ | ~~Calendar dots~~ | **Frontend only** – dots derived from booking status; no backend route. |
| 7 | POST `/service-center/bookings` | Create booking | To implement. |
| 8 | PUT `/service-center/bookings/:id` | Update booking | To implement. |
| 9 | DELETE `/service-center/bookings/:id` | Cancel/delete booking | To implement. |

We serve “service-center” under **`/api/v1/service-center`**, and “service-park” under **`/api/v1/service-park`**.

---

## 3. What we have in the database (relevant to Service Center)

You don’t have to memorize this; it’s here so we know what we can use without changing the schema first.

- **Service** (`isp_services`): `id`, `name`, `type` (REPAIR | PAINT | ADDON), `description`, `base_price`.
- **ServiceLine** (`isp_service_lines`): `id`, `name`, `type` (REPAIR | PAINT | ADDON), `branch_id`, `advisor`, `status`.
- **ServiceParkBooking** (`isp_bookings`): `id`, `branch_id`, `service_line_id`, `booking_date`, `start_time`, `end_time`, `status` (PENDING | BOOKED | COMPLETED | CANCELLED), `customer_id`, `vehicle_no`.
- **Customer**: `id`, `customer_name`, `phone_number`, etc.
- **Branch**, **BranchUnavailableDate** – already used by service-park.

Associations (from `models/index.ts`):

- `ServiceParkBooking` → Branch, ServiceLine, Customer; and “vehicle” via `ServiceParkVehicleHistory` on `vehicle_no`.
- `ServiceLine` belongs to `Branch`; `Branch` has many `ServiceLine`.

So:

- **Service types**: We can derive from `Service.type` or `ServiceLine.type` (e.g. distinct REPAIR, PAINT, ADDON) and return `{ id, name }`.
- **Lines**: Already implemented – `GET /api/v1/service-park/branches/:branchId/lines` in `servicePark.controller.ts` → `getBranchServiceLines`. Frontend base URL + this path is enough.
- **Bookings CRUD and dashboard**: Use `ServiceParkBooking` + includes (Customer, ServiceLine). The spec uses names like `vehicle_code`, `vehicle_model`, `customer_name`, `phone_number` – we’ll map from our columns (e.g. `vehicle_no` → `vehicle_code`/`vehicle_no`, Customer → `customer_name`, `phone_number`). If we don’t have `vehicle_model` in DB yet, we can return `null` or a placeholder and add it later.

---

## 4. Implementation order (how we’ll work)

We’ll add a new **service-center** module and implement in this order:

1. **Service types** – Done; you’ve seen the flow (route → controller → model).
2. **Lines** – No new code; **test** the existing route and confirm the response shape (see §6).
3. ~~**Dashboard stats**~~ – Frontend reuses data from the existing dashboard/other page; no new route.
4. **Bookings list** – Reuse `ServiceParkBooking` + includes; filters and response shaping.
5. **Single booking (by id)** – GET-by-id handler.
6. ~~**Calendar dots**~~ – Frontend derives from booking status; no backend route.
7. **Create booking** – Build on existing `createBooking` logic; validation and response shape.
8. **Update booking** – PUT handler (partial update).
9. **Delete booking** – DELETE handler (soft or hard as you decide).

For each step we’ll say which file to create or edit, then test with a quick manual call (e.g. Postman or `curl`).

---

## 5. Conventions we follow

- **Dates**: `YYYY-MM-DD` in query/body.
- **Times**: `"HH:mm"` 24h, e.g. `"08:00"`, `"17:00"`. DB uses TIME; we’ll use strings in API.
- **Errors**: `res.status(http.BAD_REQUEST).json({ message: "...", code?: "..." })` (or 404, 500). Same shape so frontend can show a single “message” field.
- **Auth**: Spec says “all routes require auth”. Right now we’ll build the handlers; you can add auth middleware to the service-center router when the team is ready.

---

## 6. Lines endpoint (already implemented) – test this

The frontend calls **GET /service-park/branches/:branchId/lines**. In this app:

- **Full URL:** `GET /api/v1/service-park/branches/:branchId/lines`
- **Handler:** `getBranchServiceLines` in `src/controllers/servicePark.controller.ts`
- **Route:** In `src/routes/servicePark.routes.ts`: `router.get("/branches/:branchId/lines", getBranchServiceLines)`

### Response shape (what to verify)

The handler returns a **JSON array** of service lines. Each item has:

| Field    | Type   | From DB | Spec / frontend need |
|----------|--------|---------|-----------------------|
| `id`     | number | ✅      | Required – use as line id. |
| `name`   | string | ✅      | Required – e.g. "Line 3 - Brake Service". |
| `type`   | string | ✅      | Optional – we send `"REPAIR"`, `"PAINT"`, or `"ADDON"`. Frontend can map to "Repair", "Paint", "Addon" if needed. |
| `advisor`| string | ✅      | Optional – in our DB it’s a string (e.g. advisor name or code). Spec said `advisor?: number`; we keep string. |

So the response is exactly what the spec’s “minimum shape” needs (`id`, `name`), plus `type` and `advisor`.

### How to test the lines route

1. Start the server: `npm run dev`
2. Pick a real `branchId` from your DB (e.g. `1`). If you’re unsure, try `1` and check for 200 vs 404.
3. Run:

   ```bash
   curl -s "http://localhost:8081/api/v1/service-park/branches/1/lines"
   ```

4. **Check:**
   - **200** → Body is a JSON array. Each element has `id`, `name`, and optionally `type`, `advisor`. If the branch has no lines, you get `[]`.
   - **400** → `{"error":"Invalid branchId"}` – e.g. path like `/branches/abc/lines`.
   - **404** → `{"error":"Branch not found"}` – no branch with that id.

5. Confirm with your frontend that this shape is what the “Select Line” dropdown expects (especially `id` and `name`). If the other page already uses this route, you’re only double-checking that the backend is what you need.

---

## 7. Testing the API

From the project root, start the server:

```bash
npm run dev
```

Then try (replace base URL if you use a different host/port):

```bash
# Service types (no branch)
curl -s "http://localhost:8081/api/v1/service-center/service-types"

# Service types filtered by branch (use a real branchId from your DB)
curl -s "http://localhost:8081/api/v1/service-center/service-types?branchId=1"

# Lines for a branch (existing route)
curl -s "http://localhost:8081/api/v1/service-park/branches/1/lines"
```

---

## 8. What’s in place and what you’ll do next

Already done or decided:

- **GET /api/v1/service-center/service-types** – implemented in `serviceCenter.controller.ts`, mounted under `/api/v1/service-center`.
- **GET /api/v1/service-park/branches/:branchId/lines** – implemented; **test it** as in §6 and confirm the response is what the frontend needs.
- **Dashboard stats** – frontend gets them from the existing dashboard/other page; no new backend route.
- **Calendar dots** – frontend logic only; no backend route.

Your next implementation steps (in order):

1. **Bookings list** – Add `getBookings` for `GET /service-center/bookings` with query `date`, `branchId`, optional `lineId`, `serviceType`. Return an array shaped like the spec (start_time, end_time as "HH:mm", vehicle_code/vehicle_no, customer_name, phone_number, vehicle_model if we have it, status, line_id, service_type from the line).
2. **Single booking** – Add `getBookingById` for `GET /service-center/bookings/:id`.
3. **Create / update / delete** – Add `createBooking`, `updateBooking`, `deleteBooking` and wire them in the router. Reuse or adapt validation and logic from the existing `createBooking` in the service-park controller.
