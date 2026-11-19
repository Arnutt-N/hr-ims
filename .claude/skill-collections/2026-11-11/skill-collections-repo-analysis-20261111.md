# Skill Collections — รายงานตรวจ Repository รอบ 2026-11-11

> ประกอบ `skill-collections-20261111.md` (catalog) · ฉบับก่อน `skill-collections-repo-analysis-20261104.md`
> ตรวจวันที่ 11 พฤศจิกายน 2026 · เวลาทั้งหมดเป็นเวลาไทย (UTC+7) · ตัวเลข ⭐/pushed ของทุก repo ใน catalog อยู่ที่ catalog §3.0 — รอบนี้เป็น **refresh ตัวเลขอย่างเดียว** (ไม่มี repo ใหม่) · หลักฐาน audit ของ `heydamir/unslop` ใน §1–§6 เป็นของรอบ 11-04 ไม่ได้ตรวจซ้ำเนื้อ
> **ผลรวม:** รับเข้า 0 · ตัดออก 0 · **refresh ทุก repo:** §3.0 ของ catalog 66 ตัว + §21 38 ตัว (ตัวเลขดิบ §7)

---

## 1. วิธีตรวจ

| รายการ | วิธี | ข้อจำกัด |
|---|---|---|
| ⭐ · forks · pushed · created · license · archived | GitHub REST API `repos/heydamir/unslop` | ค่า ⭐ ณ เวลาที่ query (11-04) · `pushed_at` แปลงเป็นเวลาไทย |
| release ล่าสุด | `releases.atom` + REST `releases` | feed ไม่มีรายการ · API ตอบ `[]` → ไม่มี GitHub Release |
| จำนวนไฟล์ / `SKILL.md` | git trees API (`recursive=1`) ของ `main` | 21 ไฟล์ · ไม่ truncated |
| commit ล่าสุด | REST `commits` (10 รายการล่าสุด) | HEAD `a6f121e` (merge PR #10) |
| refresh ทุก repo (§7) | search API แบบ batch (`repo:a repo:b …` ทีละ 8 · เว้น 7 วินาที — ไม่มี token จึงใช้แบบไม่ยืนยันตัวตน) + `releases.atom` ทุก repo ใน §3.0 และ watched list + REST `repos/…` สำหรับ repo ที่ search ไม่เจอ + `releases/latest` สำหรับ rtk / archify / oh-my-hermes | ตรวจ 2026-11-11 ~10:30–10:44 · `pushed_at` = push ล่าสุด (ไม่ใช่ commit บน default branch เสมอไป) |
| ตัวตนของ repo | README ทั้งไฟล์ | — |
| เนื้อ skill | อ่าน `SKILL.md` · `references/*.md` (5 ไฟล์) · `agents/openai.yaml` · `scripts/snapshot.mjs` · `scripts/story.mjs` ทั้งไฟล์ + grep คีย์เวิร์ด (http, fetch, spawn/exec, env, rm, install, key, telemetry, paid) | **ยังไม่ได้รัน scripts** · ไม่ได้เปิดรูป webp |

---

## 2. ตารางผล (1 ใหม่)

| # | Repository | ⭐ | pushed (BKK) | สร้าง | License | release ล่าสุด | ไฟล์ทั้ง repo | `SKILL.md` (ไฟล์) | skill จริง | ประเภท | สถานะ |
|---:|---|---:|---|---|---|---|---:|---:|---|---|---|
| 1 | [heydamir/unslop](https://github.com/heydamir/unslop) | 7,602 (forks 381) — 7,583 เมื่อตรวจครั้งแรกเช้า 11-04 | 2026-11-01 23:46 | 2026-10-29 22:41 | CC-BY-4.0 | — | 21 | 1 | 1 | Single skill (vertical anti-slop UI) | **Pilot · Choose one (UI)** |

---

## 3. หลักฐาน

### 3.1 ตัวตนและการใช้งาน

- README: "unslop is a skill for Claude Code and Codex that turns vibecoded, AI-looking UI into a designed interface with its own character" · "It works in whatever your screen is built with, like Next.js, React, Vue, Svelte, Tailwind or plain HTML and CSS … and even on a live site when all you have is a link"
- ติดตั้ง (README): Claude Code → `cp -r unslop/skills/unslop ~/.claude/skills/` · Codex → `$skill-installer install https://github.com/heydamir/unslop/tree/main/skills/unslop` หรือ copy ไป `~/.agents/skills/` · เรียกด้วย `/unslop` / `$unslop`
- ขั้นตอนใน `SKILL.md`: Look at the screen → Audit (`references/signs.md`) → Decide how much to change → **"Set the direction and stop … wait for their answer before editing"** → passes ตามลำดับ spacing · color · icons · copy · type · layout · details · visuals · motion → Report → Record (เฉพาะเมื่อขอ) · "Render the screen to check it at most three times"
- กฎที่ดี: "Do not change what the product is" · claims ที่ตรวจไม่ได้ ("Loved by 10,000+ teams") ให้ถามผู้ใช้ก่อน ไม่ได้ยืนยันให้ลบ
- commit history (12 commits · เวลาไทย): commit แรก 2026-10-28 08:02 (ก่อนสร้าง repo บน GitHub) → HEAD 2026-11-01 23:46 · Codex support (`1d13095`) 2026-11-01 07:05 · PR จากคนนอก 3 ตัว (#2, #10 garvrao80 แก้ snapshot · #9 jmsaham README Codex) · open issues 2

### 3.2 Network · shell · เงิน · telemetry

| ประเด็น | พบ | หมายเหตุ |
|---|---|---|
| Telemetry / analytics | **ไม่พบ** | ไม่มี endpoint ของผู้เขียนในโค้ด · URL ใน skill มีแค่ลิงก์เครดิต (x.com, heydamir.design) |
| API key / env | ไม่มี API key · อ่านแค่ `CHROME_PATH` (optional) | — |
| `scripts/snapshot.mjs` | เปิด URL ที่ผู้ใช้ให้ด้วย Chromium (Playwright) · `fetch()` รูป/CSS ของหน้านั้นมา inline เป็น data URL · เขียน `original.html` + `original.live.png` | network ไปเฉพาะเว็บเป้าหมายและ asset ของมัน |
| `scripts/story.mjs` | เปิด HTTP server ที่ `127.0.0.1` port สุ่ม ให้ Chromium อัดเฟรม · เรียก `ffmpeg` ผ่าน `execFileSync` (array args ไม่ผ่าน shell) · `rmSync` เฉพาะโฟลเดอร์ `.story-frames` ในโฟลเดอร์ story | เช็ค path ด้วย `target.startsWith(root)` ไม่มีตัวคั่น `/` → โฟลเดอร์ข้างเคียงที่ชื่อขึ้นต้นเหมือนกันอ่านได้ผ่าน localhost ระหว่าง render (เล็กน้อย · local เท่านั้น) |
| การติดตั้ง dependency | script **ไม่ติดตั้งเอง** — ถ้าไม่มีจะพิมพ์คำสั่ง (`npm install -D playwright` · `npx playwright install chromium` · `brew install ffmpeg`) · `SKILL.md`: "tell the user the one command that installs it" | `npm install -D` จะแก้ `package.json` ของโปรเจกต์ |
| Paid API | image generation ผ่าน MCP ที่ผู้ใช้เชื่อมเอง (fal · Replicate · OpenAI images · Higgsfield) · `references/visuals.md`: "Show the user the prompt, the model and the size, and ask before running, since generation can cost money" | ถ้าไม่มี tool → เสนอให้เชื่อม MCP · ผู้ใช้ข้ามได้ → เว้นช่องว่างไว้ + เขียน prompt ใน report |
| คำสั่งทำลาย/แก้ระบบ | ไม่พบ (นอกจาก `rmSync` โฟลเดอร์เฟรมชั่วคราว) | — |

### 3.3 ข้อสังเกตอื่น

- **ชื่อชนกัน:** `name: unslop` ซ้ำกับ skill `unslop` ของ pstack (ตัดสำนวน AI ในงานเขียน) — ติดตั้งคู่กันใน skills folder เดียวต้องเปลี่ยนชื่อโฟลเดอร์/`name` ตัวหนึ่ง
- **ขนาด:** `SKILL.md` 31,327 bytes · description 670 ตัวอักษร (trigger กว้าง: "polish, clean up or redesign a screen") · `references/refs/*.webp` 5 ไฟล์ ~1.34 MB ติดไปกับโฟลเดอร์ skill
- **License:** CC BY 4.0 — ใช้/ดัดแปลง/เชิงพาณิชย์ได้ ต้องให้เครดิต · ไม่ใช่ share-alike · `story.mjs` ฝังเครดิต `unslop by @heydamir` ในวิดีโอทุกตัว · ไฟล์ references มีบรรทัดเครดิตท้ายไฟล์
- **ดาว:** 7,583 ใน ~6 วัน (refresh 09:30 = 7,602) (โตเร็วผิดปกติ — ไม่ใช่ตัวชี้วัดคุณภาพ) · ไม่มี GitHub Release → pin commit แทน
- `agents/openai.yaml`: metadata ของ Codex (`display_name`, `short_description`, `default_prompt`) ไม่มีคำสั่ง

---

## 4. Frontmatter audit

| Repository | ไฟล์ตัวอย่าง | `name` | ความยาว description (ตัวอักษร) | key อื่นใน frontmatter | ขนาด `SKILL.md` (bytes) |
|---|---|---|---:|---|---:|
| heydamir/unslop | `skills/unslop/SKILL.md` | `unslop` | 670 | `license` · `metadata` (`author` · `x` · `site`) | 31,327 |

- ไม่มี `allowed-tools` / `disallowed-tools`

---

## 5. License ที่ยืนยัน และสิ่งที่ยังไม่ได้ตรวจ

### 5.1 ยืนยันแล้ว (11-04)

| Repository | API ตอบ | ยืนยันจากไฟล์ |
|---|---|---|
| heydamir/unslop | CC-BY-4.0 | `LICENSE` (18,657 bytes) · frontmatter `license: CC-BY-4.0` · README "credit Damir Sokolovsky … and link back to this repository" |

### 5.2 ยังไม่ได้ตรวจ

- ยังไม่ได้รัน `snapshot.mjs` / `story.mjs` จริง และยังไม่ได้ลอง skill กับหน้าจอจริง
- ยังไม่ได้ทดสอบกับ image MCP (ราคาต่อภาพของแต่ละบริการ)
- ไม่ได้เปิดดูรูป webp ใน `references/refs/` และ `examples/`
- คุณภาพผลลัพธ์เทียบ `antislop-ui` / taste-skill / Hallmark — ยังไม่ได้ benchmark
- capability matrix ภาคผนวก (A–F) — ยังไม่ทำ
- release notes ของเวอร์ชันใหม่ 22 ตัว (§7.1) — ยังไม่ได้อ่าน · เวลา release ใช้วันที่ของรายการแรกใน `releases.atom` (รวม prerelease) · ข้อยกเว้น: `rtk` / `archify` / `oh-my-hermes` มีหลายสาย tag — ดูหมายเหตุใต้ตาราง §7.1

---

## 6. Size scan (ไฟล์ทั้ง repo vs `SKILL.md`)

| Repository | ไฟล์ทั้ง repo | `SKILL.md` | % | องค์ประกอบหลัก |
|---|---:|---:|---:|---|
| heydamir/unslop | 21 | 1 | 4.8% | skill + references (md 5 · webp 5) + scripts Node 2 + examples HTML 2 · รวม ~1.5 MB |

- **ติดตั้งเฉพาะ `skills/unslop/`** — ไม่ต้องเอา `examples/` · LICENSE อยู่ที่ root (เก็บคู่ไว้ถ้าแจกต่อ)

---

## 7. Refresh ทุก repo — 2026-11-11 (เวลาไทย)

### 7.1 repo ใน catalog §3.0 (66)

| Repository | ⭐ 11-04 | ⭐ 11-11 | Δ | pushed (BKK) | ไม่มี push (วัน) | release ล่าสุด (feed) | release 11-04 | license (API) | archived |
|---|---:|---:|---:|---|---:|---|---|---|---|
| morluto/rea | 427,367 | 450,361 | +5.4% | 2026-11-11 10:35 | 0 | rea-agents-6.8.0 (2026-10-25) | rea-agents-6.8.0 (10-25) | MIT | no |
| awesome-selfhosted/awesome-selfhosted | 333,468 | 335,864 | +0.7% | 2026-11-07 18:49 | 3 | 1.0.0 (2023-09-05) | 1.0.0 (2023-09-05) | NOASSERTION | no |
| mattpocock/skills | 311,554 | 321,068 | +3.1% | 2026-11-09 21:03 | 1 | v1.3.2 (2026-10-29) | v1.3.2 (10-29) | MIT | no |
| obra/superpowers | 311,904 | 315,805 | +1.3% | 2026-11-04 06:24 | 7 | v7.0.2 (2026-11-04) | v7.0.2 (11-04) | MIT | no |
| affaan-m/ECC | 296,596 | 300,861 | +1.4% | 2026-11-09 11:56 | 1 | v2.2.3 (2026-10-02) | v2.2.3 (10-02) | MIT | no |
| multica-ai/andrej-karpathy-skills | 229,129 | 231,914 | +1.2% | 2026-04-20 17:05 | 204 | — | — | null | no |
| DietrichGebert/ponytail | 183,798 | 188,479 | +2.5% | 2026-10-29 18:59 | 12 | v5.3.3 (2026-10-29) | v5.3.3 (10-29) | MIT | no |
| JuliusBrussee/caveman | 117,245 | 118,928 | +1.4% | 2026-11-11 04:36 | 0 | v4.1.0 (2026-11-08) | bin-v4.0.2 (10-23) | Apache-2.0 | no |
| addyosmani/agent-skills | 113,066 | 115,267 | +1.9% | 2026-11-02 02:24 | 9 | 0.6.15 (2026-10-31) | 0.6.15 (10-31) | MIT | no |
| Leonxlnx/taste-skill | 109,540 | 113,051 | +3.2% | 2026-11-09 04:51 | 2 | v2.5.1 (2026-11-07) | v2.1.5 (10-25) | MIT | no |
| tt-a1i/archify | 93,162 | 95,416 | +2.4% | 2026-11-11 10:31 | 0 | archify-dsh-v1.1.0 (2026-11-08) | v3.2.0 (10-19) | Apache-2.0 | no |
| rtk-ai/rtk | 85,490 | 86,135 | +0.8% | 2026-11-11 07:38 | 0 | dev-1.2.1-rc.628 (2026-11-10) | dev-1.2.0-rc.612 (11-03 · prerelease — stable ล่าสุด v1.1.0 10-26) | Apache-2.0 | no |
| heygen-com/hyperframes | 78,416 | 82,379 | +5.1% | 2026-11-11 10:34 | 0 | v0.9.32 (2026-11-11) | v0.9.9 (11-03) | Apache-2.0 | no |
| ruvnet/ruflo | 80,805 | 81,445 | +0.8% | 2026-11-11 05:17 | 0 | v3.75.3 (2026-11-11) | v3.71.0 (11-02) | MIT | no |
| headroomlabs-ai/headroom | 78,762 | 79,323 | +0.7% | 2026-11-11 10:10 | 0 | v0.44.0 (2026-11-10) | v0.42.0 (10-27) | Apache-2.0 | no |
| cloudflare/security-audit-skill | 58,255 | 69,448 | +19.2% | 2026-09-15 02:29 | 57 | — | — | MIT | no |
| shanraisshan/claude-code-best-practice | 68,513 | 68,952 | +0.6% | 2026-11-11 10:07 | 0 | — | — | MIT | no |
| cathrynlavery/diagram-design | 64,701 | 66,356 | +2.6% | 2026-11-11 05:44 | 0 | — | — | MIT | no |
| HKUDS/CLI-Anything | 58,191 | 58,563 | +0.6% | 2026-09-22 09:01 | 50 | v0.4.0 (2026-06-25) | v0.4.0 (06-25) | Apache-2.0 | no |
| Nutlope/hallmark | 47,049 | 52,713 | +12.0% | 2026-11-11 01:01 | 0 | — | — | MIT | no |
| alibaba/open-code-review | 49,371 | 49,806 | +0.9% | 2026-11-11 09:52 | 0 | v1.13.7 (2026-11-10) | v1.13.5 (11-03) | Apache-2.0 | no |
| anthropics/claude-plugins-official | 46,004 | 46,792 | +1.7% | 2026-11-11 07:12 | 0 | — | — | Apache-2.0 | no |
| zhaoxuya520/reverse-skill | 44,060 | 44,437 | +0.9% | 2026-09-22 13:43 | 49 | v1.0.1 (2026-08-08) | v1.0.1 (08-08) | MIT | no |
| VectifyAI/PageIndex | 39,968 | 40,351 | +1.0% | 2026-11-10 22:13 | 0 | v0.5.3 (2026-11-06) | v0.5.1 (11-03) | MIT | no |
| virgiliojr94/book-to-skill | 36,881 | 37,554 | +1.8% | 2026-11-09 04:22 | 2 | v1.4.0 (2026-08-11) | v1.4.0 (08-11) | MIT | no |
| Tencent/WeKnora | 36,394 | 37,126 | +2.0% | 2026-11-09 22:19 | 1 | v0.9.0 (2026-10-29) | v0.9.0 (10-29) | NOASSERTION | no |
| baidu/Unlimited-OCR | 30,484 | 31,082 | +2.0% | 2026-11-09 14:52 | 1 | UnlimitedOCR1.0 (2026-10-23) | UnlimitedOCR1.0 (10-23) | MIT | no |
| pranshuparmar/witr | 22,917 | 22,978 | +0.3% | 2026-10-23 10:02 | 19 | v0.3.4 (2026-10-05) | v0.3.4 (10-05) | Apache-2.0 | no |
| allenai/olmocr | 19,813 | 19,820 | +0.0% | 2026-03-26 00:52 | 230 | v0.4.27 (2026-03-12) | v0.4.27 (03-12) | Apache-2.0 | no |
| memvid/memvid | 17,360 | 17,393 | +0.2% | 2026-07-14 21:39 | 119 | v2.0.140 (2026-05-28) | v2.0.140 (05-28) | Apache-2.0 | no |
| cursor/plugins | 15,252 | 15,973 | +4.7% | 2026-11-11 03:38 | 0 | — | — | null | no |
| heydamir/unslop | 7,602 | 13,849 | +82.2% | 2026-11-09 04:18 | 2 | — | — | CC-BY-4.0 | no |
| petergyang/no-ai-slop | 13,080 | 13,367 | +2.2% | 2026-09-02 11:19 | 69 | v1.0.6 (2026-08-01) | v1.0.6 (08-01) | MIT | no |
| yizhiyanhua-ai/fireworks-tech-graph | 11,932 | 11,972 | +0.3% | 2026-10-21 14:23 | 20 | v1.2.0 (2026-07-17) | v1.2.0 (07-17) | MIT | no |
| ibelick/ui-skills | 10,581 | 10,943 | +3.4% | 2026-11-07 21:47 | 3 | v0.2.3 (2026-06-22) | v0.2.3 (06-22) | MIT | no |
| PDFCraftTool/pdfcraft | 9,757 | 9,818 | +0.6% | 2026-11-08 08:06 | 3 | v2026.11.08-98e89d4 (2026-11-08) | v2026.10.29-664f501 (10-29) | AGPL-3.0 | no |
| miqdadbadjuber/anti-slop | 8,116 | 8,892 | +9.6% | 2026-11-10 20:35 | 0 | v3.2.28 (2026-11-10) | v3.2.25 (11-01) | MIT | no |
| trailofbits/skills | 7,984 | 8,118 | +1.7% | 2026-11-06 22:20 | 4 | — | — | CC-BY-SA-4.0 | no |
| anthropics/defending-code-reference-harness | 7,702 | 7,730 | +0.4% | 2026-08-07 04:42 | 96 | — | — | NOASSERTION | no |
| antvis/Infographic | 7,063 | 7,087 | +0.3% | 2026-10-20 12:28 | 21 | 0.2.19 (2026-05-06) | 0.2.19 (05-06) | MIT | no |
| ScrapeCreators/social-media-research-skills | 5,399 | 6,216 | +15.1% | 2026-08-27 00:26 | 76 | — | — | MIT | no |
| awslabs/aidlc-workflows | 5,661 | 6,006 | +6.1% | 2026-11-11 10:29 | 0 | v2.11.4-preview.20261110.1 (2026-11-11) | v2.11.3-preview.20261103.1 (11-04) | MIT-0 | no |
| rlaope/oh-my-hermes | 5,091 | 5,391 | +5.9% | 2026-11-11 10:27 | 0 | omher-v0.2.3 (2026-11-11) | v4.0.5 (11-03) | MIT | no |
| kajisho5/ffmpeg-skill | 4,462 | 5,027 | +12.7% | 2026-11-11 10:29 | 0 | v3.3.0 (2026-11-11) | v3.1.1 (11-01) | MIT | no |
| IvanMurzak/Unity-MCP | 4,577 | 4,615 | +0.8% | 2026-11-11 10:24 | 0 | 1.10.0 (2026-11-10) | 1.6.0 (10-31) | Apache-2.0 | no |
| michael-denyer/pstack-claude | 3,909 | 4,216 | +7.9% | 2026-11-11 07:20 | 0 | v0.9.135 (2026-11-11) | v0.9.128 (11-04) | MIT | no |
| agentscope-ai/ReMe | 3,748 | 3,785 | +1.0% | 2026-11-11 08:31 | 0 | v0.4.2.2 (2026-11-05) | v0.4.2.1 (10-27) | Apache-2.0 | no |
| plugin87/ux-ui-agent-skills | 3,088 | 3,155 | +2.2% | 2026-11-10 14:20 | 0 | v3.1.0 (2026-11-10) | v3.0.0 (10-26) | MIT | no |
| typesafe-ai/skills | 2,872 | 2,892 | +0.7% | 2026-10-24 04:40 | 18 | v0.6.2 (2026-10-24) | v0.6.2 (10-24) | MIT | no |
| kenryu42/cc-safety-net | 1,908 | 1,992 | +4.4% | 2026-11-11 07:13 | 0 | v2.7.9 (2026-11-11) | v2.7.2 (11-02) | MIT | no |
| tracewayapp/traceway | 1,752 | 1,766 | +0.8% | 2026-11-11 02:19 | 0 | cli/v2.0.10 (2026-11-10) | cli/v2.0.8 (10-29) | MIT | no |
| alibaba/skill-up | 1,415 | 1,452 | +2.6% | 2026-11-09 16:27 | 1 | v0.15.0 (2026-11-09) | v0.14.0 (10-20) | Apache-2.0 | no |
| ognjengt/founder-skills | 659 | 670 | +1.7% | 2026-05-19 02:44 | 176 | — | — | MIT | no |
| NousResearch/hermes-official-plugins | 588 | 650 | +10.5% | 2026-11-10 23:03 | 0 | — | — | MIT | no |
| sharpdeveye/maestro | 592 | 602 | +1.7% | 2026-04-29 19:33 | 195 | v2.0.0 (2026-04-26) | v2.0.0 (04-26) | MIT | no |
| codexstar69/bug-hunter | 549 | 557 | +1.5% | 2026-10-30 01:32 | 12 | v3.2.1 (2026-10-30) | v3.2.1 (10-30) | MIT | no |
| Lifecycle-Innovations-Limited/claude-ops | 548 | 551 | +0.5% | 2026-11-10 18:05 | 0 | v3.12.1 (2026-11-02) | v3.12.1 (11-02) | MIT | no |
| ghostsecurity/skills | 437 | 441 | +0.9% | 2026-09-28 20:49 | 43 | — | — | Apache-2.0 | no |
| agamm/claude-code-owasp | 428 | 438 | +2.3% | 2026-11-04 02:29 | 7 | — | — | MIT | no |
| syahiidkamil/Software-Engineer-AI-Agent-Atlas | 404 | 406 | +0.5% | 2026-11-01 11:14 | 9 | v3.0.0 (2026-11-01) | v3.0.0 (11-01) | null | no |
| mukul975/Privacy-Data-Protection-Skills | 330 | 336 | +1.8% | 2026-03-17 03:06 | 239 | v1.0.0 (2026-03-16) | v1.0.0 (03-16) | Apache-2.0 | no |
| tanviet12/vbsec | 323 | 328 | +1.5% | 2026-09-28 13:10 | 43 | — | — | MIT | no |
| yonatangross/orchestkit | 299 | 301 | +0.7% | 2026-11-11 06:10 | 0 | v10.10.8 (2026-11-09) | v10.7.4 (11-04) | MIT | no |
| AgriciDaniel/pya | 270 | 277 | +2.6% | 2026-10-23 20:17 | 18 | v2.0.0 (2026-10-23) | v2.0.0 (10-23) | MIT | no |
| jrenaldi79/harness-engineering | 126 | 126 | +0.0% | 2026-11-10 21:28 | 0 | v1.4.0 (2026-11-03) | v1.4.0 (11-03) | MIT | no |
| I-CAN-hack/pdf-mcp | 82 | 82 | +0.0% | 2026-10-19 18:45 | 22 | — | — | MIT | no |

- ไม่มี repo ใดถูก archive / disabled / rename (`full_name` ตรงกับที่ catalog อ้างทุกตัว) · license ที่ API ตอบเหมือน 11-04 ทุกตัว
- `rtk`: รายการแรกใน feed เป็น prerelease `dev-1.2.1-rc.628` · REST `releases/latest` = v1.2.0 (2026-11-08 17:46)
- `archify`: รายการแรกใน feed เป็น pack `archify-dsh-v1.1.0` (Archify for DeepSeek Harness) · REST `releases/latest` ของบรรทัดหลัก = v3.2.0 (2026-10-19) — ไม่เปลี่ยนจาก 11-04
- `oh-my-hermes`: รายการแรกใน feed เป็น pack `omher-v0.2.3` · REST `releases/latest` ของบรรทัดหลัก = v4.0.7 (2026-11-09) (เดิม v4.0.5)
- `defending-code-reference-harness` ข้าม 90 วันเป็นครั้งแรก (96 วัน) จึงขึ้นตัวหนาใน §3.0 · ไม่มี repo ใน §3.0 ข้ามเกณฑ์เงียบ 60 วันเป็นครั้งแรก · `security-audit-skill` เงียบ 57 วัน

### 7.2 repo ใน catalog §21 (38 ที่ระบุ owner ได้)

| Repository | ⭐ 11-04 | ⭐ 11-11 | pushed (BKK) | ไม่มี push (วัน) | license (API) | สถานะ |
|---|---:|---:|---|---:|---|---|
| OrchestratorInc/agent-orchestrator | 14,057 | 14,408 | 2026-11-11 | 0 | Apache-2.0 | ปกติ |
| adriannoes/awesome-agentic-ai | 95 | 97 | 2026-11-03 | 8 | MIT | ปกติ |
| jub0t/Concat | 14,019 | 16,561 | 2026-11-11 | 0 | AGPL-3.0 | ปกติ |
| Comfy-Org/ComfyUI | 144,892 | 146,222 | 2026-11-11 | 0 | GPL-3.0 | ปกติ |
| future-agi/traceAI | 266 | 266 | 2026-11-11 | 0 | Apache-2.0 | ปกติ |
| AprilNEA/OpenLogi | 25,054 | 25,526 | 2026-11-11 | 0 | Apache-2.0 | ปกติ |
| agentuniverse-ai/agentUniverse | 2,427 | 2,430 | 2026-10-25 | 17 | Apache-2.0 | ปกติ |
| WhitzardAgent/AgentGuard | 158 | 159 | 2026-11-06 | 4 | GPL-3.0 | ปกติ |
| memvid/memvidbench | 6 | 6 | 2026-01-10 | 305 | null | ปกติ |
| LockedinLabs-AI/agent-console | — | — | — | — | — | **404** (REST + search) |
| tonhowtf/omniget | — | — | — | — | — | **404** (REST + search) |
| blue-yonder/tsfresh | 9,488 | 9,491 | 2026-07-06 | 128 | MIT | ปกติ |
| Botspot/pi-apps | 2,844 | 2,846 | 2026-11-11 | 0 | GPL-3.0 | ปกติ |
| ConduitPlatform/Conduit | 925 | 927 | 2026-11-11 | 0 | MIT | ปกติ |
| johnxie/awesome-code-docs | 67 | 66 | 2026-11-10 | 1 | MIT | ปกติ |
| awesome-opencode/awesome-opencode | 10,855 | 10,948 | 2026-11-06 | 4 | CC0-1.0 | ปกติ |
| 666ghj/MiroFish | 83,777 | 85,220 | 2026-10-16 | 26 | AGPL-3.0 | ปกติ |
| rahulnyk/knowledge_graph | 4,179 | 4,181 | 2026-08-15 | 87 | MIT | ปกติ |
| marc-shade/world-intel-mcp | 1,059 | 1,068 | 2026-10-19 | 23 | MIT | ปกติ |
| danish296/codevibes | 263 | 263 | 2026-01-12 | 302 | MIT | ปกติ |
| TencentCloud/TencentDB-Agent-Memory | 30,404 | 30,763 | 2026-11-10 | 0 | NOASSERTION | ปกติ |
| vstorm-co/full-stack-ai-agent-template | 1,972 | 1,982 | 2026-11-10 | 1 | MIT | ปกติ |
| MarkPDFdown/markpdfdown | 2,314 | 2,319 | 2026-09-23 | 49 | Apache-2.0 | ปกติ |
| midudev/autoskills | 6,986 | 6,997 | 2026-11-09 | 2 | NOASSERTION | ปกติ |
| punnerud/Local_Knowledge_Graph | 584 | 585 | 2026-08-14 | 89 | NOASSERTION | ปกติ |
| lst97/claude-code-sub-agents | 1,705 | 1,709 | 2025-08-15 | 452 | MIT | ปกติ |
| OpenAgentPlatform/Dive | 1,823 | 1,824 | 2026-07-31 | 103 | MIT | ปกติ |
| zilliztech/claude-context | 12,668 | 12,686 | 2026-07-14 | 119 | MIT | ปกติ |
| insaaniManav/prompt-forge | 791 | 791 | 2025-07-17 | 482 | GPL-3.0 | ปกติ |
| notlikeDev/CCPlugins | 2,771 | 2,774 | 2026-09-11 | 61 | MIT | **rename → `brennercruvinel/CCPlugins`** · **archived** |
| morphik-org/morphik-core | 3,720 | 3,720 | 2026-11-04 | 6 | NOASSERTION | ปกติ |
| scrapy/scrapy | 65,208 | 65,322 | 2026-11-10 | 0 | BSD-3-Clause | ปกติ |
| microsoft/promptflow | 11,260 | 11,264 | 2026-10-31 | 10 | MIT | ปกติ |
| TEN-framework/ten-framework | 11,220 | 11,228 | 2026-11-10 | 0 | NOASSERTION | ปกติ |
| icereed/paperless-gpt | 2,807 | 2,833 | 2026-11-07 | 4 | MIT | ปกติ |
| Zipstack/unstract | 7,410 | 7,441 | 2026-11-10 | 0 | AGPL-3.0 | ปกติ |
| iflytek/skillhub | 5,371 | 5,393 | 2026-11-10 | 0 | Apache-2.0 | ปกติ |
| asgeirtj/system_prompts_leaks | 70,718 | 71,159 | 2026-11-10 | 0 | CC0-1.0 | ปกติ |

- §21 แถวที่ไม่ระบุ owner ใน catalog ใช้ owner จากลิงก์ในเอกสารรอบก่อน · `headroom` · `PageIndex` · `olmocr` · `pdfcraft` · `pdf-mcp` · `awesome-selfhosted` อยู่ใน §7.1 แล้ว
- `CCPlugins` ยังชี้ไป `brennercruvinel/CCPlugins` และ archived เหมือน 11-04 (push ล่าสุดยัง 2026-09-11 · เงียบ 61 วันในรอบนี้) · `agent-console` / `omniget` ยัง 404

### 7.3 watched repos (42 · ไม่อยู่ใน catalog ถ้ายังไม่ได้ใส่ §3.0 / §21)

ตรวจซ้ำวันที่ 2026-11-11 · เทียบกิจกรรมตั้งแต่ 2026-10-28 (ค่าใน `watched-repos.last` ก่อนหน้า) · **watch-only ไม่ได้ถูกเพิ่มเข้า catalog ในรอบนี้**

| Repository | กลุ่ม | ⭐ 11-11 | pushed | release ล่าสุด (feed) | กิจกรรมตั้งแต่ 10-28 |
|---|---|---:|---|---|---|
| ScrapeCreators/social-media-research-skills | §3.0 | 6,216 | 2026-08-27 | — | ไม่มี |
| plugin87/ux-ui-agent-skills | §3.0 | 3,155 | 2026-11-10 | v3.1.0 (2026-11-10) | push 2026-11-10 · rel v3.1.0 (2026-11-10) |
| jub0t/concat | §21 (ตัดแล้ว) | 16,561 | 2026-11-11 | v0.2.10 (2026-11-11) | push 2026-11-11 · rel v0.2.10 (2026-11-11) |
| cathrynlavery/diagram-design | §3.0 | 66,356 | 2026-11-11 | — | push 2026-11-11 |
| cloudflare/security-audit-skill | §3.0 | 69,448 | 2026-09-15 | — | ไม่มี |
| OrchestratorInc/agent-orchestrator | §21 (ตัดแล้ว) | 14,408 | 2026-11-11 | v0.14.11-nightly.202611102030 (2026-11-11) | push 2026-11-11 · rel v0.14.11-nightly.202611102030 (2026-11-11) |
| rlaope/oh-my-hermes | §3.0 | 5,391 | 2026-11-11 | omher-v0.2.3 (2026-11-11) | push 2026-11-11 · rel omher-v0.2.3 (2026-11-11) |
| alibaba/skill-up | §3.0 | 1,452 | 2026-11-09 | v0.15.0 (2026-11-09) | push 2026-11-09 · rel v0.15.0 (2026-11-09) |
| NousResearch/hermes-official-plugins | §3.0 | 650 | 2026-11-10 | — | push 2026-11-10 |
| Comfy-Org/ComfyUI | §21 (ตัดแล้ว) | 146,222 | 2026-11-11 | v0.45.2 (2026-11-11) | push 2026-11-11 · rel v0.45.2 (2026-11-11) |
| heygen-com/hyperframes | §3.0 | 82,379 | 2026-11-11 | v0.9.32 (2026-11-11) | push 2026-11-11 · rel v0.9.32 (2026-11-11) |
| anthropics/claude-plugins-official | §3.0 | 46,792 | 2026-11-11 | — | push 2026-11-11 |
| future-agi/traceAI | §21 (ตัดแล้ว) | 266 | 2026-11-11 | traceai-openai-v0.1.14 (2026-11-10) | push 2026-11-11 · rel traceai-openai-v0.1.14 (2026-11-10) |
| AprilNEA/OpenLogi | §21 (ตัดแล้ว) | 25,526 | 2026-11-11 | v0.9.0 (2026-11-04) | push 2026-11-11 · rel v0.9.0 (2026-11-04) |
| tracewayapp/traceway | §3.0 | 1,766 | 2026-11-11 | cli/v2.0.10 (2026-11-10) | push 2026-11-11 · rel cli/v2.0.10 (2026-11-10) |
| jrenaldi79/harness-engineering | §3.0 | 126 | 2026-11-10 | v1.4.0 (2026-11-03) | push 2026-11-10 · rel v1.4.0 (2026-11-03) |
| agentuniverse-ai/agentUniverse | §21 (ตัดแล้ว) | 2,430 | 2026-10-25 | v0.0.19.1 (2026-09-14) | ไม่มี |
| AgriciDaniel/pya | §3.0 | 277 | 2026-10-23 | v2.0.0 (2026-10-23) | ไม่มี |
| tanviet12/vbsec | §3.0 | 328 | 2026-09-28 | — | ไม่มี |
| agamm/claude-code-owasp | §3.0 | 438 | 2026-11-04 | — | push 2026-11-04 |
| ghostsecurity/skills | §3.0 | 441 | 2026-09-28 | — | ไม่มี |
| WhitzardAgent/AgentGuard | §21 (ตัดแล้ว) | 159 | 2026-11-06 | v2.1 (2026-07-05) | push 2026-11-06 |
| codexstar69/bug-hunter | §3.0 | 557 | 2026-10-30 | v3.2.1 (2026-10-30) | push 2026-10-30 · rel v3.2.1 (2026-10-30) |
| kenryu42/cc-safety-net | §3.0 | 1,992 | 2026-11-11 | v2.7.9 (2026-11-11) | push 2026-11-11 · rel v2.7.9 (2026-11-11) |
| anthropics/defending-code-reference-harness | §3.0 | 7,730 | 2026-08-07 | — | ไม่มี |
| trailofbits/skills | §3.0 | 8,118 | 2026-11-06 | — | push 2026-11-06 |
| memvid/memvid | §3.0 | 17,393 | 2026-07-14 | v2.0.140 (2026-05-28) | ไม่มี |
| memvid/memvidbench | §21 (ตัดแล้ว) | 6 | 2026-01-10 | — | ไม่มี |
| alibaba/open-code-review | §3.0 | 49,806 | 2026-11-11 | v1.13.7 (2026-11-10) | push 2026-11-11 · rel v1.13.7 (2026-11-10) |
| adriannoes/awesome-agentic-ai | §21 (ตัดแล้ว) | 97 | 2026-11-03 | v1.6.0 (2026-11-03) | push 2026-11-03 · rel v1.6.0 (2026-11-03) |
| baidu/Unlimited-OCR | §3.0 | 31,082 | 2026-11-09 | UnlimitedOCR1.0 (2026-10-23) | push 2026-11-09 |
| unclebob/ub-mode | **watch-only** | 7,633 | 2026-11-02 | — | push 2026-11-02 |
| unclebob/crapper | **watch-only** | 224 | 2026-11-11 | — | push 2026-11-11 |
| unclebob/dryer | **watch-only** | 93 | 2026-10-04 | — | ไม่มี |
| unclebob/mutator | **watch-only** | 117 | 2026-11-11 | — | push 2026-11-11 |
| android/skills | **watch-only** | 10,456 | 2026-11-10 | v1.0.21 (2026-11-09) | push 2026-11-10 · rel v1.0.21 (2026-11-09) |
| android/android-cli-plugin | **watch-only** | 4 | 2026-11-05 | — | push 2026-11-05 |
| entireio/cli | **watch-only** | 5,332 | 2026-11-11 | v0.13.3-nightly.202611102023.11f68117e (2026-11-11) | push 2026-11-11 · rel v0.13.3-nightly.202611102023.11f68117e (2026-11-11) |
| entireio/entire-graph | **watch-only** | 133 | 2026-11-11 | v0.6.1-nightly.202611090613.0e6bbba3 (2026-11-09) | push 2026-11-11 · rel v0.6.1-nightly.202611090613.0e6bbba3 (2026-11-09) |
| entireio/entire-brain | **watch-only** | 95 | 2026-11-11 | v0.5.1-nightly.202611100617.0f898ab4 (2026-11-10) | push 2026-11-11 · rel v0.5.1-nightly.202611100617.0f898ab4 (2026-11-10) |
| entireio/skills | **watch-only** | 240 | 2026-11-06 | — | push 2026-11-06 |
| entireio/forgemark | **watch-only** | 59 | 2026-10-28 | — | push 2026-10-28 |

- watch-only 11 ตัว (ยังไม่เข้า catalog): `unclebob/ub-mode` · `unclebob/crapper` · `unclebob/dryer` · `unclebob/mutator` · `android/skills` · `android/android-cli-plugin` · `entireio/cli` · `entireio/entire-graph` · `entireio/entire-brain` · `entireio/skills` · `entireio/forgemark` — รายละเอียดอยู่ใน changelog-entry
