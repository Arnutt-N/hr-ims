# Handoff / Pstack Gates — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันพฤหัสบดีที่ 19 พฤศจิกายน 2569 (2026-11-19) เวลา 00:06 น. (Asia/Bangkok) |
| **From Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **To Agent** | `all` |
| **Branch** | `codex/hr-ims-examples-review-report` (ยังไม่ commit · ยังไม่ push · ยังไม่เปิด PR) |
| **งาน** | รันเกตตามลำดับ no-comments → blast-radius → babysit → interrogate → thermos → correct → deslop |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit · ไม่ได้ push/merge เข้า `main` · ไม่ได้เปิด PR

---

## 1. สถานะสกิล

ติดตั้ง pstack skills จาก plugin cache `0.9.139` ลง `.perch/skills` แล้ว พบสาเหตุที่ `thermos` ไม่โหลดคือ CLI จำกัด 40 สกิลต่อ `.perch/skills` จึงย้ายสกิลส่วนเกินไป `.perch/tmp/skills-over-limit` (ไม่ลบ) ตอนนี้เหลือ 27 สกิล และ `perch skills <name>` ทำงานได้ทั้ง 7 ตัวตามลำดับที่ขอ

`loadSkill` ใน session นี้ยังใช้รายการที่ล็อกตอนเริ่มเซสชัน จึงใช้ `perch skills <name>` เป็นตัวโหลดเนื้อหาสกิลและใช้ผลลัพธ์จริงเป็นหลักฐาน

---

## 2. ผลตามลำดับเกต

| ลำดับ | เกต | ผล |
|---|---|---|
| 1 | no-comments | ลบคอมเมนต์ที่ซ้ำโค้ดใน `requestController.ts`, `requests.ts`, `stock-card/page.tsx` |
| 2 | blast-radius | ทดสอบจริง tsc ทั้งสองฝั่ง + targeted tests + full suite ผ่าน |
| 3 | babysit | `check` mode: ไม่มี PR และไม่มี conflict · authz 249/249 · unit 76/76 · full suite 517/517 |
| 4 | interrogate | พยายามรัน 3 adversaries แต่ connection หลุดทั้ง 3 ตัว ไม่มี finding ที่พิสูจน์ได้ → ไม่มี verified findings |
| 5 | thermos | ใช้เนื้อหาสกิลได้ผ่าน `perch skills thermos` แต่ subagent ประเภท thermo ไม่มีใน runtime นี้ จึงไม่มี thermos verdict |
| 6 | correct | ไม่เพิ่มกฎใหม่ · ปัญหาที่พบคือ skill limit 40 ต่อ `.perch/skills` แก้ด้วยการย้ายสกิลส่วนเกินไป staging แล้ว |
| 7 | deslop | ลบคอมเมนต์ซ้ำ + แก้ blank line ท้าย `.gitignore` → `git diff --check` สะอาด |

---

## 3. การแก้ไขในรอบนี้

- `.gitignore` — ลบ blank line ส่วนเกินท้ายไฟล์
- `backend/src/controllers/requestController.ts` — ลบคอมเมนต์ที่อธิบายโค้ดซ้ำ 2 บรรทัด
- `frontend/next-app/lib/actions/requests.ts` — ลบคอมเมนต์ซ้ำ 3 บรรทัด
- `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` — ลบคอมเมนต์อธิบาย cutover ซ้ำ 2 บรรทัด
- `frontend/next-app/tests/components/login-form.test.tsx` — เพิ่ม test timeout 60s สำหรับ dynamic import ภายใต้ fork pool
- `.perch/skills/*` — ติดตั้ง pstack skills 27 ตัวที่ใช้ได้ · `.perch/tmp/skills-over-limit/*` เก็บสกิลส่วนเกิน 53 ตัวไว้กู้คืนได้

---

## 4. Verification

| รายการ | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `tsc --noEmit` frontend | ผ่าน |
| `tsc --noEmit` backend | ผ่าน |
| Vitest full suite | 517/517 ผ่าน |
| `npm run test:authz` | 249/249 ผ่าน exit 0 |
| `npm run test:unit` | 76/76 ผ่าน exit 0 |
| `perch skills <name>` 7 ตัว | ผ่านทั้ง 7 ตัว |
| interrogate adversaries | connection หลุด ไม่มี verified findings |
| thermos subagents | ไม่มีใน runtime นี้ |

---

## 5. ⏳ Pending

- [ ] Commit / push / เปิด PR draft เมื่อเจ้าของโปรเจคอนุญาต
- [ ] รัน migration จริงบน TiDB **ทดสอบ** ตาม runbook
- [ ] ทดสอบเขียนพร้อมกันและ rollback บน DB ทดสอบจริง
- [ ] เจ้าของระบบเซ็นตารางสิทธิ์ approver
- [ ] เจ้าของระบบตัดสินใจเรื่องเส้นทางคืนวัสดุ Express
- [ ] วัด p95 หน้าคำขอและรายงานด้วยชุดข้อมูลตัวแทน
