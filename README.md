# PM_Eye

> Tool quản lý **Dự án · Nhân sự · Chi phí vận hành** cho PM/leader.
> Nhìn 1 phát biết ai burn, ai rảnh, dự án nào sắp vượt budget — có lý do để nói với sếp và điều chỉnh nhanh.

Built with **Next.js 15 (App Router) + Supabase + Tailwind + Recharts**.

---

## 1. Tính năng chính

### Dashboard tổng quan
- **4 stat cards**: dự án ongoing, nhân sự active, burn tháng này, số cảnh báo.
- **Burn chart** 6 tháng (lương + chi phí vận hành stack lên nhau).
- **Alert feed** tự sinh: burnout, bench/rảnh, vượt budget, thiếu role theo giai đoạn.
- **Team Heatmap** 6 tháng tới: mỗi ô = % tải của 1 người trong 1 tháng — burnout đỏ pulse, bench xám, healthy xanh.
- **Project health bars**: ngân sách vs đã tiêu, badge "vượt budget" / "sắp hết".

### Quản lý
- **Nhân sự** ([/employees](src/app/(app)/employees/page.tsx)): CRUD, hiện luôn % load tháng hiện tại.
- **Dự án** ([/projects](src/app/(app)/projects/page.tsx)) + chi tiết: chia giai đoạn (phases), khai báo required roles → tự tính gap.
- **Phân bổ** ([/allocations](src/app/(app)/allocations/page.tsx)): slider 0–100%, cảnh báo overload ngay khi gán.
- **Chi phí vận hành** ([/expenses](src/app/(app)/expenses/page.tsx)): donut chart theo category, gán vào dự án hoặc chung.

### Logic tính toán (xem [src/lib/calculations.ts](src/lib/calculations.ts))
- **Cost** = `base_salary × percent × (overlap_days / days_in_month)` cộng dồn theo tháng.
- **Load** = tổng % của nhân sự đó qua tất cả allocations overlap với tháng.
- **Status thresholds**: 0 = bench · <50% = rảnh · 50–100% = healthy · 100–120% = quá tải · >120% = burnout.
- **Phase gap** = `required_roles - assigned_FTE` (theo từng role).

---

## 2. Setup nhanh (≈ 10 phút)

### B1. Cài đặt
```bash
cd /Users/developer/Documents/PM_Eye
npm install
```

### B2. Tạo project Supabase
1. Vào https://supabase.com → **New project** (free tier OK).
2. Sau khi project sẵn sàng → vào **SQL Editor** → **New query** → paste toàn bộ nội dung [supabase/schema.sql](supabase/schema.sql) → **Run**.
3. Vào **Settings → API** lấy 2 giá trị:
   - `Project URL`
   - `anon public` key

### B3. Env vars
```bash
cp .env.local.example .env.local
```
Mở [.env.local](.env.local) và điền:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### B4. Tạo tài khoản admin
1. Trong Supabase Dashboard → **Authentication → Users → Add user** (manual).
2. Hoặc bật **Authentication → Providers → Email** rồi đăng ký từ trang `/login` trong app.

> Đây là **tool nội bộ** — RLS đã được cấu hình cho phép bất kỳ user đã auth full access.
> Nếu không muốn ai khác đăng ký được, tắt **Sign-ups** trong Supabase Auth settings, hoặc thay policy bằng `auth.uid() = '<your-uid>'`.

### B5. Chạy
```bash
npm run dev
```
Mở http://localhost:3000 → đăng nhập → bắt đầu nhập liệu.

---

## 3. Quy trình dùng (theo thứ tự)

1. **Thêm nhân sự** (`/employees`): nhập tên, role, lương /tháng.
2. **Tạo dự án** (`/projects`): nhập ngân sách tổng, chọn màu.
3. **Vào chi tiết dự án** (`/projects/[id]`): thêm các **giai đoạn** (phase) với ngày + (tùy chọn) yêu cầu role.
4. **Phân bổ** (`/allocations`): kéo slider % thời gian, chọn từ ngày–đến ngày, gán vào project/phase.
5. **Ghi chi phí** vận hành (`/expenses`): server, license, outsource, v.v.
6. Quay về **Dashboard** → toàn bộ chart + cảnh báo tự cập nhật.

---

## 4. Deploy lên Vercel (2 phút)

```bash
git init && git add . && git commit -m "init PM_Eye"

# tạo repo trên GitHub rồi:
git remote add origin git@github.com:<user>/PM_Eye.git
git push -u origin main
```

1. Vào https://vercel.com → **Add New Project** → import repo.
2. Add 2 env vars `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. Xong.

---

## 5. Cấu trúc thư mục

```
src/
├── app/
│   ├── (app)/              # Authenticated layout (sidebar)
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Dashboard
│   │   ├── employees/
│   │   ├── projects/[id]/
│   │   ├── allocations/
│   │   └── expenses/
│   ├── login/
│   ├── globals.css
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Button, Card, Input, Modal, Badge
│   ├── dashboard/          # StatCards, BurnChart, AlertList, TeamHeatmap, ProjectHealth
│   ├── Sidebar.tsx
│   └── PageHeader.tsx
├── lib/
│   ├── supabase/           # client / server / middleware
│   ├── calculations.ts     # cost & load logic
│   ├── data.ts             # fetchAll() server helper
│   └── utils.ts            # formatCurrency, cn, dates
├── types/database.ts
└── middleware.ts           # auth gate
supabase/schema.sql         # full DB schema + RLS
```

---

## 6. Mở rộng tiếp (gợi ý)

- **Export PDF/Excel** từng dự án để gửi sếp.
- **Forecast**: dự báo burn 3 tháng tới dựa trên allocation đã book.
- **Compare**: so 2 phương án staffing.
- **Slack alert** mỗi sáng thứ 2 nếu có warning mới.
- **Multi-tenant**: thêm `org_id` vào tất cả bảng + RLS theo user.
