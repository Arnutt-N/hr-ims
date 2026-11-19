# Perch CLI — pstack skill registration: the real mechanism

| Field | Value |
|-------|-------|
| **วันที่** | 19 พฤศจิกายน 2569 (Asia/Bangkok) |
| **Agent** | `perch` (Perch Desktop — persona: Quill) |
| **CLI ที่ตรวจ** | `perchai-cli` 2.4.137 |
| **ขอบเขต** | ตรวจ bundle ที่ติดตั้งจริง + ทดลองซ้ำได้ ไม่ได้แก้โค้ดแอป |

> Iron Rules acknowledged — ไม่ได้แตะ `.env` · ไม่ได้ push/merge · ไม่มี secret ในเอกสารนี้

---

## 1. ข้อสรุป

`perch skills` โหลดสกิล pstack ได้ **ครบ 80 จาก 80** หลังย้ายเข้า plugin สองตัวที่ `.perch/plugins/` และตัด `python-data-assistant` ออกจาก project scope หนึ่งตัว (เดิมโหลดได้ 27)

เพดานจริงคือ **96 สกิลทั้งเครื่อง** ไม่ใช่ 40 ต่อโฟลเดอร์ตามที่ handoff ก่อนหน้าอ้าง

---

## 2. กลไกจริง (อ่านจาก bundle + พิสูจน์ซ้ำ)

ค่าคงที่ใน `dist/perch.mjs`:

| ค่า | ความหมาย |
|---|---|
| `bmr = 40` | เพดาน **ต่อโฟลเดอร์** (`.perch/skills`, `.agents/skills`, `~/.perch/skills`, `~/.agents/skills`, และ `skills/` ของแต่ละ plugin) |
| `kmr = 96` | งบ **รวมทั้งเครื่อง** ใช้ร่วมกันทุก scope |
| `vmr = 16` | เพดานจำนวน plugin ต่อโฟลเดอร์ `plugins/` |
| `TBi = 64000` | ขนาดสูงสุดของ `SKILL.md` ต่อไฟล์ |

ลำดับการอ่าน: project (`.perch/skills` → `.agents/skills` → `.perch/plugins/*`) แล้วจึง personal (`~/.perch/skills` → `~/.agents/skills`) — **project มาก่อน personal เสมอ**

### สิ่งที่ handoff ก่อนหน้าอ้างผิด

handoff `2026-11-19_0006` เขียนว่า "CLI จำกัด 40 สกิลต่อ `.perch/skills`" ถูกแค่ครึ่งเดียว 40 คือเพดานต่อโฟลเดอร์ แต่ตัวที่ทำให้สกิลหลุดคือ **96 รวมทั้งเครื่อง** การย้ายสกิลไปโฟลเดอร์อื่นจึงไม่ช่วยเลย

### plugin ไม่ได้ให้โควตาเพิ่ม

ทดลองแล้ว: plugin ยังถูกนับเข้า `kmr = 96` เดียวกัน และ `skills/` ของ plugin ก็ติดเพดาน 40 ต่อโฟลเดอร์ด้วย

### ข้อจำกัดที่เจอจากการทดลอง

- **junction ใช้ไม่ได้** — `SKILL.md resolves outside the plugin folder` เพราะมี realpath containment check ต้องเป็นไฟล์จริง (copy) เท่านั้น
- **`plugin.json` ต้องไม่มี BOM** — PowerShell `Set-Content -Encoding UTF8` เติม BOM และ parser ตอบ `plugin.json is not valid JSON: Unexpected token '๏ปฟ'` ต้องเขียนด้วย `UTF8Encoding($false)`
- **`$schema` บังคับ** — ค่าที่รับคือ `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
- **ชื่อสกิลใน plugin ถูก prefix** เป็น `pstack-a:architect` ในรายการ แต่ `perch skills <name>` ไม่รับทั้งชื่อเต็มและชื่อเปล่า จึงใช้รายการจาก `perch skills` เป็นหลักฐานแทน
- **ไม่มี env var ปรับเพดาน** — สแกน `PERCH_*` ทั้ง 111 ตัวแล้ว ไม่มีตัวใดเกี่ยวกับ skill limit

---

## 3. สถานะปัจจุบัน

| ที่อยู่ | จำนวน | โหลดได้ |
|---|---|---|
| `.perch/plugins/pstack-a/skills` | 40 | 40 |
| `.perch/plugins/pstack-b/skills` | 40 | 40 |
| `.agents/skills` (HR-IMS) | 16 | 16 |
| `.perch/skills` | 0 | — |
| **รวมที่โหลด** | | **96 (เต็มเพดาน)** |

สกิลที่ตัดออกเพื่อให้พอดีเพดาน: `python-data-assistant` (16.3 KB, เป็นความรู้ data science ทั่วไป ไม่ผูกกับ repo) ลบด้วย `git rm` ผ่านการลบไฟล์ตรง กู้คืนได้ด้วย `git checkout -- .agents/skills/python-data-assistant`

---

## 4. ผลข้างเคียงที่ต้องรู้

การจัดวางนี้ทำให้ **personal skills (`~/.perch/skills`, `~/.agents/skills`) โหลดได้ 0 ตัว** เพราะ project scope กินงบ 96 ไปหมดแล้ว ก่อนหน้านี้ personal เคยได้ 41 ตัว

ถ้าต้องการ personal กลับมา ต้องลดจำนวนสกิลใน project scope ลงเท่ากับจำนวนที่ต้องการ เช่นต้องการ personal 20 ตัว ต้องเหลือ project ไม่เกิน 76

---

## 5. ทางเลือกถ้าต้องได้ personal คืน

ตอนนี้ project scope กินงบ 96 เต็ม ทำให้ personal skills โหลดได้ 0 ตัว ทุกตัวที่ตัดเพิ่มจาก `.agents/skills` จะคืนช่องให้ personal 1 ตัวตามลำดับ

ตัวที่ตัดได้แบบเจ็บน้อย (ยังไม่ได้ตัด):

| ตัว | ขนาด | เหตุผลที่ตัดได้ |
|---|---|---|
| `accessibility-guidelines` | 10.7 KB | ไม่มี ref ถึง repo เลย pstack `design-*` ทดแทนได้ |
| `system-documentation` | 6.5 KB | ref ถึง repo แค่ 1 จุด |
| `api-documentation` | 10.6 KB | ซ้ำกับ `technical-writing` ของ pstack |

หรือถ้าต้องการ pstack น้อยลง ก็ตัด plugin ออกได้ทั้งก้อน

---

## 6. ขั้นตอนกู้คืน

```powershell
# ดูรายการและ diagnostics
perch skills

# ตรวจว่าโฟลเดอร์ plugin ยังครบ
Get-ChildItem .perch/plugins -Directory | ForEach-Object {
  "$($_.Name): $((Get-ChildItem (Join-Path $_.FullName 'skills') -Directory).Count)"
}

# ต้นฉบับอยู่ที่ ~/.agents/skills เสมอ (ไม่ถูกแก้)
Test-Path "$HOME\.agents\skills\poteto-mode\SKILL.md"
```

ต้นฉบับทั้ง 486 สกิลใน `~/.agents/skills` **ไม่ถูกแก้หรือลบ** การย้ายเป็น copy เข้า plugin เท่านั้น

---

## เอกสารอ้างอิง

- `dist/perch.mjs` ใน `perchai-cli` 2.4.137 — ฟังก์ชัน `cje`, `_mr`, `IBi`, `xcn`
- `perch help` — คำอธิบาย `perch skills` และ `perch skills disable|enable <plugin>:<skill>`
- ผลรัน `perch skills` ใน `D:\00 hrProject\hr-ims` วันที่ 19 พฤศจิกายน 2569
