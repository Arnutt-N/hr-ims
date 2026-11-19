# Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันจันทร์ที่ 16 พฤศจิกายน 2569 (2026-11-16) เวลา 14:31 น. |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Session Duration** | 16 พ.ย. 2569 01:30 → 16 พ.ย. 2569 14:31 น. |
| **Branch ที่ทำงาน** | ไม่มีการแตะ git — งานทั้งหมดเป็นการอ่านและเขียนเอกสารใน `secrets/examples` |
| **สถานะรวม** | ✅ เสร็จครบทุกงาน · เขียนเอกสาร 5 ไฟล์ · ไม่มีการแก้โค้ดแอป · ไม่มี commit |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit ในเซสชันนี้
> ไม่ได้แตะไฟล์ `.env` · ไม่ได้รันคำสั่งที่เขียนข้อมูลลงฐานข้อมูล · ไม่ได้ push/merge ใด ๆ

---

## 🎯 ภารกิจของเซสชันนี้

ผู้ใช้ขอให้อ่านและวิเคราะห์โค้ด/เอกสารใน `D:\00 hrProject\hr-ims\secrets\examples`
แบบครบทุกโฟลเดอร์และทุกไฟล์ แล้วต่อยอดเป็นการเปรียบเทียบกับ HR-IMS และข้อเสนอการปรับใช้

**หมายเหตุเรื่อง skill:** ผู้ใช้สั่ง "use skill pstack" แต่ **pstack ไม่ได้ติดตั้งในโปรเจคนี้**
(ตรวจ `~/.claude/skills`, `~/.cursor`, `.claude/skills` แล้วไม่พบ) จึงดึง `how` skill
จาก upstream `cursor/plugins` มาดำเนินการตามวิธีโดยตรง — read-only exploration แล้ว
เขียนคำอธิบายเชิงสถาปัตยกรรม จากนั้นใช้ skill `cross-agent-handoff` สำหรับงานนี้

---

## ✅ Completed Work (งานที่ทำเสร็จ)

### 1. Codebase walkthrough — ครบ 14 ไฟล์ 4 โฟลเดอร์

**ไฟล์ที่สร้าง:** `secrets/examples/CODEBASE_WALKTHROUGH.md` (1,052 บรรทัด)

**วิธีทำ:** ใช้ pstack `how` — แตกงานเป็น 4 agent อ่านขนานกัน (explore, read-only)
โฟลเดอร์ละตัว แล้ว我自己 ปิดช่องว่างที่ agent ถูกรัดผลลัพธ์ (truncated) ด้วยการอ่านไฟล์จริงเพิ่ม

**สิ่งที่ค้นพบสำคัญ:**

| # | เรื่อง | หลักฐาน |
|---|---|---|
| 1 | โฟลเดอร์ `เบิกพัสดุ-V2` **ไม่มีครุภัณฑ์เลย** — 5 ชีตแบน ไม่มี status column, auth คือ `password === '1234'` | `code.gs.txt:268`, `:60/68/76` |
| 2 | `code1.gs` และ `code2.gs` เป็น **comment 100%** (0 บรรทัดที่รันได้ จาก 419 และ 329) | นับ non-comment = 0 |
| 3 | `index-v2` กับ `index` (live) ต่างกันแค่ **4 จาก 80 ฟังก์ชัน** — ที่เหลือเป็น CSS | whitespace-normalised diff |
| 4 | `egp` ไม่ใช่ e-GP integration — เป็น spec rebuild ระบบโรงเรียน, e-GP จริง out-of-scope | `SPEC.md:1-5`, `:42` |
| 5 | `Documents.RefID` ถูกเขียนเป็น `''` เสมอ → เลขเอกสารผูกกับ record ไม่ได้ | `code.gs.txt:122` |
| 6 | `reqIssue` ตั้ง `IssuedQty = Qty` เต็มจำนวนเสมอ → เบิกบางส่วนไม่ได้ | `code.gs.txt:567` |
| 7 | `runAllFixes` → `fixMembersSheet` **`clear()` ชีต Members ทั้งชีต** | `code.gs.txt:22, 451` |
| 8 | `verifyPassword_` **ยอมรับ plaintext** ถ้าไม่มี prefix `sha256$` | `รหัส.gs:494` |

### 2. เปรียบเทียบกับ HR-IMS — ตรวจจากโค้ดจริง

**ไฟล์ที่สร้าง:** `secrets/examples/COMPARISON_HR-IMS_TH.md` (245 บรรทัด)

**ตัวเลข HR-IMS ที่ตรวจแล้ว:**
- `schema.prisma` **40 model**
- `lib/actions/` **28 ไฟล์ / 100 `export async function`** (หนักสุด `maintenance.ts` 62.6 KB / 17 actions)
- เทสต์ **57 ไฟล์** (frontend 36 + backend 21)
- backend มีชั้นครบ: `controllers, jobs, lib, middleware, queues, routes, services, tests, utils`

**ข้อค้นพบที่สำคัญที่สุด:** HR-IMS **ไม่มีแนวคิดครุภัณฑ์เลย** — ค้น `ครุภัณฑ์`, `วัสดุ`,
`เลขครุภัณฑ์`, `ค่าเสื่อม`, `ราคาซาก`, `งบประมาณ`, `ผู้ค้า`, `จัดซื้อ`, `จำหน่าย`
ใน `schema.prisma` ได้ **0 ครั้งทุกคำ** และไม่มีฟิลด์ `depreciation`/`salvage`/`usefulLife`/
`assetCode`/`regNo`/`qrCode`/`fiscalYear`/`budget`/`vendor`/`procurement`/`disposal`

### 3. แผนที่ฟังก์ชันและลำดับการทำงาน — 3 โปรเจค Apps Script

**ไฟล์ที่สร้าง:** `secrets/examples/FUNCTION_MAP_TH.md` (1,121 บรรทัด)

ครอบคลุม:
- **A** 70 ฟังก์ชัน (5 ชั้น, `ACT` 40 action, 21 หน้า, 6 สายการทำงาน)
- **B** 16 ฟังก์ชัน (ไม่มี dispatcher, 10 หน้า, 4 สาย)
- **C** 66 ฟังก์ชัน (6 ชั้น, `handleApi_` 26 case, 30 หน้า, 4 สาย)
- **เจาะลึก `Pages.scan` ของ A** — ไล่ทีละบรรทัด 6 ฟังก์ชัน 2 ฝั่ง (687-712 + 628-665)

**จุดที่เจาะลึกแล้วพบ:**
- กล้องถูกปิดทุกชิ้นที่สแกนได้ (`index.html:696`) → ช้าเวลาตรวจจริง 100+ ชิ้น
- `conflict` เทียบด้วย **ชื่อ free text** (`code.gs.txt:635, 642`) → กฎกันผลประโยชน์ทับซ้อนหลุดได้
- `inspSummary` เริ่มจากทะเบียนไม่ใช่จากผล (`:657-659`) → เห็นของที่ยังไม่ตรวจ (ทำถูก)
- `save` ใน `onCode` ไม่อยู่ใน `run()` → error หลุดเป็น unhandled rejection

### 4. อัปเดต spec ชุดใหม่ — พบว่าโฟลเดอร์เปลี่ยนภาพรวม

**ไฟล์ที่สร้าง:** `secrets/examples/SPEC-SUITE_UPDATE_TH.md` (239 บรรทัด)

**ตรวจ MD5 ทุกไฟล์ .md — พบว่า 4 ไฟล์ใหม่ แต่ใหม่จริงแค่ 2:**

| ไฟล์ | MD5 (10 ตัวแรก) | สถานะ |
|---|---|---|
| `egp\SPEC-egp-school-procurement.md` | `165BC3051A` | **สำเนา** ของ `egp\SPEC.md` |
| `egp\SPEC.md` | `165BC3051A` | ต้นฉบับ |
| `ระบบคลังพัสดุ\SPEC-stock-requisition.md` | `BD9CC3966B` | **สำเนา** ของ `ระบบคลังพัสดุ\SPEC.md` |
| `ระบบคลังพัสดุ\SPEC.md` | `BD9CC3966B` | ต้นฉบับ |
| `ระบบทะเบียนรับพัสดุครุภัณฑ์และแจ้งซ่อม\SPEC-repair-maintenance.md` | `A6C75AD104` | **ใหม่จริง** (FixTrack, 1,026 บรรทัด) |
| `ระบบบริหารงานพัสดุ\SPEC-procurement-system.md` | `DE1EA6A43B` | **ใหม่จริง** (ProcureHub, 979 บรรทัด) |

**ข้อค้นพบ:** โฟลเดอร์นี้ไม่ใช่ "4 โปรเจค" แต่เป็น **ชุด spec 5 ตัวที่อ้างอิงกันเอง**
(SchoolProc, StockReq, ProcureHub, FixTrack + **PlanBudget ที่ไม่มีไฟล์**)
นับคำที่อ้างถึง: SchoolProc 78 · StockReq 19 · FixTrack 11 · ProcureHub 10 · **PlanBudget 1**

**และ spec ทั้ง 4 เลือก stack เดียวกับ HR-IMS** (Next.js + Prisma + Postgres + Zod)
→ คำถามไม่ใช่ "จะทำใหม่ไหม" แต่คือ "HR-IMS มี util ที่ต้องการแล้วกี่ตัว"

### 5. ข้อเสนอการปรับใช้ — 3 ระดับ

**ไฟล์ที่สร้าง:** `secrets/examples/ADOPTION_PLAN_TH.md` (306 บรรทัด)
**ตรวจแล้ว: HR-IMS ไม่มี util ราชการเลยสักตัว** — ค้น `bahtText`, `fiscalYear`, `taxId`,
`withholding`, `VAT`, `ปีงบประมาณ`, `บาทถ้วน` ใน `lib/` และ `backend/src` ได้ **0 ตรงทุกคำ**
ที่มีคือ `lib/date-utils.ts` (73 บรรทัด) — แค่ พ.ศ. + วันที่ไทย ไม่มีปีงบ ไม่มีวันทำการ ไม่มีเลขไทย

| ระดับ | สาระ | ตัวอย่าง |
|---|---|---|
| **A. หยิบมาใช้เลย** | สูตร/ตารางที่ spec เขียนเสร็จ | `thresholdRules()` 4 ระดับ · VAT/WHT · `bahtText` · `taxId` checksum · checklist B1–B18 |
| **B. ส่วนเสริม** | โมดูลที่ HR-IMS ยังขาด | ชั้นต้นทุน/ล็อต · `Asset` model · งบประมาณ · เอกสาร A4 · SLA/คะแนนช่าง |
| **C. อย่าแตะ** | สถาปัตยกรรม Apps Script | eval client source · positional row identity · `checkPassword === '1234'` |

**จุดที่สำคัญที่สุดในระดับ A:** `ProcureHub:570` ระบุว่าต้นแบบใช้ WHT **3% ซึ่งน่าจะผิด**
สำหรับหน่วยงานรัฐ และให้ใช้ 1% ของยอดตามก่อน VAT → ถ้าลอกต้นแบบตามจะผิดตามไปด้วย

### 6. เก็บกวาด HANDOFF_BOARD — รายการค้างเกิน 6 เดือน

**ไฟล์:** `project-log-md/handoff/HANDOFF_BOARD_ARCHIVE.md` (ใหม่) +
แก้ `HANDOFF_BOARD.md` (131 → 127 บรรทัด)

**หลักการ:** ย้ายเฉพาะที่ **ตรวจแล้วว่าปิดจริง** ไม่ใช่แค่เก่า — ตรวจโค้ด/git ก่อนทุกข้อ

| รายการ | หลักฐาน |
|---|---|
| swagger-jsdoc | `backend/package.json` มี dependency + types ครบ |
| middleware.ts conflict | `middleware.ts` ไม่มีอยู่แล้ว เหลือ `proxy.ts` |
| Git Release v1.5.0 | tag `v1.5.0` มีจริง 2026-02-13 12:12:23 +0700 |
| `.agents` cutover | migration note 2026-04-03 ใน `AGENTS.md` |
| Superadmin RBAC | กลืนเข้า PR #33/#34/#35 |

**จุดที่พบ:** task "Finalize Git Release v1.5.0" บันทึกค้าง แต่ tag สร้าง 12:12:23
และ handoff ส่ง 12:15 — ห่าง 3 นาที ผู้ส่งยังไม่รู้ว่า tag ออกแล้ว

**ตัวเลข:** Tasks 14→10 · Queue 13→7 · Issues 13→11 · Activity 21→11
— ย้ายทั้งหมด ไม่ลบ · log ต้นทาง 20 ไฟล์ยังอยู่ครบ

**คงไว้เพราะยังเปิดจริง:** `cloudflared.exe` ใน git history · Quick Demo seed
`*@demo.com` · แถว agent `kilo` ที่ idle ตั้งแต่ 2026-01-30

---

## ⏳ Pending Work (งานที่ยังไม่ทำ)

### งานที่ผมเสนอแล้วแต่ยังไม่เริ่ม (รอผู้ใช้สั่ง)

- [ ] **`lib/thai-procurement/`** — เขียน `thresholds.ts`, `vat-wht.ts`, `baht-text.ts`,
      `tax-id.ts` + unit test ที่ใช้ตารางจาก spec เป็น fixture
      - Context: ตารางวงเงินอยู่ที่ `egp SPEC:737-744` · สูตร VAT/WHT ที่ `:686-707`
      - ประมาณ 2–3 วัน · ไม่แตะ schema · test ง่าย
      - Priority: 🔴 High
- [ ] **ชั้นต้นทุน/ล็อต** — เพิ่ม `StockLot` หรือ `unitCost` ใน `StockTransaction`
      - Context: `StockLevel` มีแค่ `quantity`+`reserved` · `InventoryItem` ไม่มีฟิลด์ราคาเลย
      - อ้างโครงจาก `257.คลังพัสดุ` `StockLots` · ใช้ `Decimal` ไม่ใช่ `Float`
      - ประมาณ 3–5 วัน · Priority: 🔴 High
- [ ] **`Asset` model แยกจาก `InventoryItem`** — พร้อม `AssetCategory.lifeYears`,
      `Asset.salvage @default(1)`, `Asset.assetCode @unique`
      - Context: `egp SPEC:616-620` · ห้ามแก้ `InventoryItem` ให้กลายเป็นครุภัณฑ์
      - Priority: 🟡 Medium
- [ ] **เอา B1–B18 ของ FixTrack เป็น acceptance checklist** ก่อน merge โมดูลพัสดุ
      - Context: `FixTrack:688-712` · งาน 1 ชั่วโมง · Priority: 🟢 Low (แต่คุ้มมาก)

### งานที่รอเจ้าของตัดสินใจ (จาก open questions ของ spec)

- [ ] **WHT 1% เทียบยอดก่อน VAT หรือรวม VAT · ต่อครั้งหรือต่อใบสั่ง** — `SchoolProc:904`
- [ ] **ครุภัณฑ์ qty > 1 แตกเป็นรายตัวหรือเก็บเป็นแถวเดียว** — `ProcureHub:904`
- [ ] **ค่าเสื่อม รายวันหรือรายเดือน · ปีแรกตามปีงบหรือปีปฏิทิน** — `SchoolProc:906`
- [ ] **เกณฑ์ครุภัณฑ์ต่ำกว่าเกณฑ์ 10,000 / ซอฟต์แวร์ 20,000 ใช่ไหม** — `SchoolProc:907`
- [ ] **ต้องมีขั้นอนุมัติการเบิก หรือเบิกตัดทันที** — `ProcureHub:906`
- [ ] **ต้อง migrate ข้อมูลจาก Google Sheets เดิมไหม** — `ProcureHub:902`
- [ ] **PlanBudget อยู่ที่ไหน** — เอกสารถูกอ้าง (`FixTrack:902`) แต่ไม่มีไฟล์ในโฟลเดอร์
      → ถ้าจะทำส่วนงบประมาณ **ต้องได้ไฟล์นี้ก่อน**

### งานค้างจากเซสชันก่อน (15 พ.ย. — ยังไม่ปิด)

- [ ] **`docs/agents-enforcement-truth`** — push แล้วแต่ยังไม่เปิด PR
- [ ] **หนี้ assertion 8 ไฟล์** — security suite ที่เรียก `recordResult()` เฉย ๆ จึงผ่านเสมอ
- [ ] **เพิ่ม job เป็น required checks** — `Backend · authz`, E2E, Lighthouse ยังไม่บล็อก merge
- [ ] **PR #24, #30** — ค้างและ `CONFLICTING`
- [ ] **ทำความสะอาด** — `hr-ims-pr26` (313 ไฟล์), `.audit/` (~50,298 ไฟล์), backup refs 3 ตัว

---

## ⚠️ Issues & Observations (ปัญหา/ข้อสังเกต/ข้อแนะนำ)

- ⚠️ **Warning**: **pstack ไม่ได้ติดตั้งในโปรเจคนี้** — ผู้ใช้สั่งใช้ skill นี้ แต่ตรวจ
  `~/.claude/skills`, `~/.cursor`, `.claude/skills` แล้วไม่พบ · แก้โดยดึง `how` จาก
  upstream `cursor/plugins` มาดำเนินการตามวิธีโดยตรง · ถ้าต้องการใช้ซ้ำควรติดตั้งจริง
- ⚠️ **Warning**: **agent 4 ตัวถูกรัดผลลัพธ์ที่ output limit** — 3 ใน 4 รายงานขาดส่วน
  "risks / version differences / open questions" ซึ่งเป็นส่วนที่ใช้ตัดสินใจ · แก้โดยผมอ่าน
  ไฟล์จริงเพิ่มเอง (SPEC 764-971, รหัส.gs 1-112, README, MENU/PG) ไม่ได้เดาจาก agent
- ⚠️ **Warning**: `read_document` อ่าน PDF ไม่ได้ — `Cannot find module 'pdf.worker.mjs'`
  ใน Perch CLI install · แก้โดยตรวจ PDF ที่ระดับ byte (1 หน้า, Word LTSC, มี font/image/ToUnicode)
  และระบุในเอกสารว่า **ไม่ได้อ่านเนื้อหา** ไม่ได้อ้างว่าไม่มีอะไรใหม่
- 🐛 **Bug (ในโค้ดตัวอย่าง ไม่ใช่ HR-IMS)**: `index.html:2612` ของ SACS — `disposals` row
  `DSP-2605-003` ใช้ `assetId: aid(49)` แต่ `assetName: an(48)` → คู่ไม่ตรงกัน
- 🐛 **Bug (ในโค้ดตัวอย่าง)**: `index.html:2483-2484` คำนวณ `id` สองครั้ง ซ้ำซ้อน (dead code)
- 📝 **Note**: `Select-String -Recurse` ใช้ไม่ได้บน PowerShell 5.1 → ต้องใช้ `Get-ChildItem | Select-String`
  หรือ grep tool แทน · กระทบเวลาเขียนสคริปต์ตรวจ
- 📝 **Note**: `Get-ChildItem -Recurse` บน repo นี้ timeout ที่ 120 วิ (node_modules ใหญ่)
  → ต้องจำกัด path ให้แคบทุกครั้ง
- 💡 **Suggestion**: `SCHEMA` ของ SACS (`รหัส.gs:53-98`) มีคำอธิบายไทย 1 บรรทัดต่อชีต
  — HR-IMS ควรมีเอกสารแบบนี้สำหรับ 40 model ของตัวเอง

---

## 📂 Files Changed

| Action | File Path | Description |
|--------|-----------|-------------|
| Created | `secrets/examples/CODEBASE_WALKTHROUGH.md` | walkthrough 14 ไฟล์ 4 โฟลเดอร์ (1,052 บรรทัด) |
| Created | `secrets/examples/COMPARISON_HR-IMS_TH.md` | เปรียบเทียบกับ HR-IMS (245 บรรทัด) |
| Created | `secrets/examples/FUNCTION_MAP_TH.md` | แผนที่ฟังก์ชัน 3 โปรเจค + เจาะ Pages.scan (1,121 บรรทัด) |
| Created | `secrets/examples/SPEC-SUITE_UPDATE_TH.md` | อัปเดต spec ชุดใหม่ + MD5 (239 บรรทัด) |
| Created | `secrets/examples/ADOPTION_PLAN_TH.md` | ข้อเสนอการปรับใช้ 3 ระดับ (306 บรรทัด) |
| Created | `project-log-md/perch/2026-11-16_1431_session-summary.md` | ไฟล์นี้ |
| Created | `project-log-md/handoff/HANDOFF_BOARD_ARCHIVE.md` | รายการค้างเกิน 6 เดือนที่ย้ายออก พร้อมหลักฐาน |
| Modified | `project-log-md/handoff/HANDOFF_BOARD.md` | สถานะ perch · sprint tasks · queue · issues · activity log · เก็บกวาด 6 เดือน |

**ไม่มีการแก้ไขไฟล์ใดใน HR-IMS** — ไม่แตะ `schema.prisma`, `lib/`, `backend/`, `frontend/`
ไม่มีการ commit, ไม่มีการ push, ไม่มีการเปิด PR

---

## 🔗 อ้างอิง

- เอกสารที่สร้างทั้ง 5 ไฟล์อยู่ใน `D:\00 hrProject\hr-ims\secrets\examples\`
- spec ที่วิเคราะห์: `egp\SPEC-egp-school-procurement.md` (SchoolProc v0.2),
  `ระบบคลังพัสดุ\SPEC-stock-requisition.md` (StockReq v0.1),
  `ระบบบริหารงานพัสดุ\SPEC-procurement-system.md` (ProcureHub v0.1),
  `ระบบทะเบียนรับพัสดุครุภัณฑ์และแจ้งซ่อม\SPEC-repair-maintenance.md` (FixTrack v0.1)
- โค้ดที่วิเคราะห์: `257.ระบบคลังพัสดุเทศบาลและอบต.V.1` (820+841 บรรทัด),
  `ระบบบริหารพัสดุครุภัณฑ์-เบิกพัสดุ-V2` (467 live + 748 inert),
  `Asset control system` (1,292 + 2,830 บรรทัด)
- session summary ก่อนหน้า: `project-log-md/perch/2026-11-15_1638_session-summary.md`
