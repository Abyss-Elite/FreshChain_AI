# FreshChain AI

FreshChain AI la demo logistics SaaS ket noi chu xe tai/xe lanh con tai trong trong voi doanh nghiep can van chuyen nong san, thuy san tuoi song. Trong tam demo la AI Matching & Logistics Optimization bang rule-based scoring, khong dung computer vision, khong xu ly bao hiem hay phap ly hang hoa.

## Tech stack

- Frontend: Next.js 15 App Router, TypeScript, TailwindCSS, shadcn/ui-style components, Framer Motion, React Hook Form, Zustand, Recharts, Sonner.
- Backend: Node.js, Express.js, PostgreSQL, Prisma ORM, JWT Authentication, Socket.io.
- Khac: Google Maps API placeholder/mock map, seed data demo, fake realtime updates.

## Folder structure

```txt
freshchain-ai/
  frontend/
    app/                  # Landing, auth, dashboard va cac man demo
    components/           # App shell, cards, shadcn-style UI
    lib/                  # Demo data, matching helper, utils
    store/                # Zustand demo store
  backend/
    prisma/
      schema.prisma       # PostgreSQL database design
      seed.ts             # 20 xe tai + 30 don hang
      migrations/         # Init migration placeholder
    src/
      routes/             # Auth + REST API
      services/           # Matching + compatibility scoring
      middleware/         # JWT auth
      utils/              # Prisma + HTTP helpers
```

## Database design

Prisma models chinh:

- `User`: role `SHIPPER`, `CARRIER`, `ADMIN`.
- `Shipment`: thong tin hang hoa, route, gia de xuat, status va compatibility declaration.
- `Truck`: tai trong, xe lanh, range nhiet do, route hien tai, ETA.
- `Match`: matching score, compatibility score, distance/capacity/time score, estimated savings, warnings.
- `Deal`: proposed/counter/final price, accept/reject.
- `TrackingEvent`: GPS, nhiet do, ETA, alert.

## API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/dashboard`
- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/trucks`
- `POST /api/trucks`
- `GET /api/match/:shipmentId`
- `POST /api/aggregate`
- `POST /api/deals`
- `PATCH /api/deals/:id`
- `GET /api/admin/analytics`

## Mock AI matching logic

Backend va frontend deu co rule-based scoring de demo nhanh:

- Temperature compatibility: xe lanh, temp min/max, frozen required.
- Remaining capacity: tai trong con trong so voi khoi luong don.
- Distance scoring: tuyen trung/gan tuyen.
- Time compatibility: ETA so voi deadline giao.
- Compatibility rules: smell conflict, temperature conflict, fragile cargo warning, not recommended to combine.

Vi du:

- `Sau rieng + Tao` -> `Smell Conflict`.
- `Hai san dong lanh + Rau cu` -> `Temperature Conflict`.
- `Rau la + hang nang` -> `Fragile Cargo Warning`.

## Run project

Yeu cau: Node.js 20+, PostgreSQL local.

Backend:

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Mo demo tai `http://localhost:3000`.

Tai khoan seed:

- Shipper: `shipper@freshchain.vn` / `123456`
- Carrier: `carrier@freshchain.vn` / `123456`
- Admin: `admin@freshchain.vn` / `123456`

## Demo pages

1. Landing Page
2. Login/Register
3. Dashboard
4. Create Shipment
5. Register Truck
6. AI Matching Page
7. Multi-truck Aggregation
8. Tracking Map
9. Compatibility Screen
10. Deal Price Screen
11. Order Management
12. Admin Analytics

## Notes

- Tracking map dang la mock visual co route path va realtime fake updates. De noi Google Maps that, them `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` va thay component map bang Google Maps JS SDK.
- Migration SQL placeholder duoc kem theo; Prisma schema la source of truth. Chay `npx prisma migrate dev --name init` se sinh migration day du theo database local.
