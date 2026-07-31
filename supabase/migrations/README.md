# Migrations

**Không chạy các file migration cũ** (`20260515_*`, `20260516_*`, `20260519_*`) trên DB mới.

Schema chuẩn hiện tại là file gốc:

→ [`../schema.sql`](../schema.sql)

File đó **reset toàn bộ `public` schema** (RBAC multi-role). Chạy một lần trên SQL Editor sau khi backup.
