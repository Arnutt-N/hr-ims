# Agent Skill Collections และเครื่องมือเสริม — ฉบับคัดเลือกใช้งาน

> เอกสารอ้างอิงข้ามโปรเจกต์และข้ามแพลตฟอร์ม
> แพลตฟอร์มเป้าหมาย: Claude Code · Codex (App/CLI) · Cursor · Antigravity · Gemini CLI · GitHub Copilot CLI · Grok Build CLI · Factory Droid · Devin CLI · Kimi Code · OpenCode · Pi · Hermes · Zed · Qwen · Cline · Kilo · Qoder · Mistral Vibe · DeepSeek Harness · MiMo CLI และ MCP clients — ระดับการรองรับจริงดู §12
> อัปเดต: 11 พฤศจิกายน 2026 · **ฉบับ 20261111** (ต่อจากฉบับ 2026-11-04 · ไม่มี repo ใหม่ · ตัดออก 0 · **refresh ตัวเลข §3.0 ทุกตัว (66) + ตรวจสถานะ repo ใน §21 (38)** · ดู §22)
>
> 📄 **โฟลเดอร์นี้ standalone** — ไฟล์ในโฟลเดอร์ (catalog · repo-analysis · appendix ฉบับ 20261111 + changelog-entry-20261111 สำหรับต่อท้าย changelog) ใช้ประกอบกันได้ครบ คัดลอกทั้งโฟลเดอร์ไปใช้ที่ไหนก็ได้ ทุกลิงก์ชี้ URL ภายนอก
> ไฟล์อ้างอิงเพิ่มเติม (อยู่นอกโฟลเดอร์นี้ — ไม่จำเป็นต่อการใช้ไฟล์ในนี้):
> `skill-collections-changelog.md` (ประวัติทุกรอบ — ต่อท้ายด้วย `skill-collections-changelog-entry-20261111.md`) · `skill-collections-20261104.md` (ฉบับก่อน) · `skill-collections-repo-analysis-20261104.md` (หลักฐานรอบ 11-04) · `skill-collections-repo-analysis-20261028.md` (หลักฐานรอบ 10-28)

> ⚠️ **ก่อนใช้งาน:** ตัวเลข ⭐ และวันที่ push อยู่ที่ **§3.0 ที่เดียว** พร้อมวันที่ตรวจ ส่วนอื่นอ้างวันที่/license เฉพาะเมื่อจำเป็นต่อการตัดสินใจ (เช่น เงียบนาน, AGPL) และต้องตรงกับ §3.0 · ระบบเหล่านี้อัปเดตบ่อย **ให้เช็ค repo ต้นทาง (§20) ก่อนติดตั้งจริงเสมอ**

---

## 1. TL;DR

Skill ecosystem ควรจัดเป็นหลายชั้น ไม่ควรติดตั้งทุก repository เป็น skill collection พร้อมกัน

```text
Layer 0 — Behavioral baseline (เลือก 1 ตัวเป็น global)
  karpathy (default)  OR  caveman / ponytail (Pilot — mode ค้างทั้ง session + hooks · caveman มีกลุ่ม Cloud ที่ส่งข้อมูลออก)

Layer 1 — Process discipline (เลือก 1 เป็นหลัก)
  superpowers  OR  pstack (หยิบราย skill)

Layer 2 — SDLC collection หลัก (เลือก 1)
  mattpocock OR addyosmani OR ecc OR orchestkit OR aidlc-workflows (Pilot — แทน Layer 1+2 ทั้งคู่)

Layer 3 — Agent-workflow engineering เฉพาะเมื่อจำเป็น (เลือก 1)
  maestro OR ruflo

Domain verticals — เปิดตามชนิดงาน
  founder-skills                     business / GTM / pricing / SOP
  ui-skills | ux-ui-agent-skills     product UI / a11y / design system      (เลือก 1)
  taste-skill | Hallmark             landing / portfolio / redesign         (เลือก 1)
  anti-slop | no-ai-slop             anti-slop ราย surface (UI·code / text)
  unslop (heydamir)                  redesign UI ที่ดูเป็น AI ทีละ pass   (Pilot · เลือก 1 กับ antislop-ui)
  Infographic                        data storytelling
  archify | fireworks | diagram-design   technical diagram                  (เลือก 1)
  security-audit-skill               defensive security audit (workflow หลัก)
  trailofbits/skills                 security research / audit (หยิบราย plugin · CC-BY-SA)
  claude-code-owasp                  OWASP knowledge ตอนเขียนโค้ด (opt-in)
  social-media-research-skills       social/creator research (opt-in · API เสียเงิน)
  reverse-skill | rea                authorized reverse engineering         (restricted, เลือก 1)
  Privacy-Data-Protection-Skills     compliance ราย jurisdiction
  ffmpeg-skill                       media processing
  Atlas · claude-code-best-practice  methodology reference (อ่านเป็นแนวทาง — ไม่ติดตั้ง)

Product-specific packs — เฉพาะ runtime/โปรเจกต์ที่ใช้
  Codex Security · Trigger.dev · typesafe-ai/skills · Unity-MCP
  HyperFrames (video) · Traceway (observability) · oh-my-hermes / hermes-official-plugins (Hermes เท่านั้น)

Skill infrastructure — จัดการ collection ไม่ใช่ content
  autoskills · SkillHub · book-to-skill · skill-up (eval/ปรับปรุง skill)
  cc-safety-net (guard hook ก่อนรันคำสั่ง — Pilot) · claude-plugins-official (marketplace — Reference)

Hybrid integrations — มี skill adapter แต่ตัวตนหลักเป็น tool
  Graphify | Graft | Understand-Anything   (เลือก 1)
  rtk · witr · WeKnora · claude-ops (pilot) · CLI-Anything (ราย CLI) · ReMe (pilot, memory)
  open-code-review (review CLI + 2 skills)

Pure tool/MCP companions — ไม่มี router-facing skill
  headroom, world-intel-mcp, claude-context, TencentDB-Agent-Memory, PageIndex,
  MarkPDFdown, Morphik, olmocr, pdfcraft, pdf-mcp, Scrapy, Promptflow, TEN,
  paperless-gpt, Unstract, memvid (Reference), Unlimited-OCR (Reference)
```

### 1.1 กรอบความคิด — "2 แกน + verticals"

Layer model บอก *ลำดับการติดตั้ง* ส่วนกรอบนี้บอก *ทำไมบางชุดทับซ้อนกันน้อย* — ชุดที่อยู่คนละแกนมักใช้ร่วมกันได้เพราะเนื้อหาไม่ซ้ำ **แต่ยังต้องตรวจ routing/trigger, context budget, hooks และ project instructions ก่อนเปิดพร้อมกัน**

**แกน A — สร้างซอฟต์แวร์ (SDLC):** จัดชั้นตาม altitude จากพฤติกรรมพื้นฐาน → กระบวนการ → playbook ครบวงจร

```text
ระดับสูง  ┌──────────────────────────────────────────────────┐
(กว้าง)   │  ecc | orchestkit — ทุกอย่าง + domain/hooks         │  หลักร้อย skill
          ├──────────────────────────────────────────────────┤
          │  addyosmani   — full-SDLC playbook (spec→ship)      │  24 skills
          │  mattpocock   — เครื่องมือคิด/engineering            │  ~35 skills
          ├──────────────────────────────────────────────────┤
          │  superpowers | pstack — วินัยกระบวนการ               │  ~14 / ~50
          ├──────────────────────────────────────────────────┤
ระดับล่าง  │  karpathy | caveman | ponytail — พฤติกรรมพื้นฐาน     │  always-on
(แคบ/ลึก)  └──────────────────────────────────────────────────┘
```

**แกน B — วิศวกรรมเวิร์กโฟลว์ของ AI agent เอง (meta-layer):** ทำงาน *บนตัว agent* ไม่ใช่บนโค้ดแอป

```text
          ┌─────────────────────────────────────────────┐
          │  maestro  — audit→fix เวิร์กโฟลว์ AI agent    │  1 core + 24 cmd
          │  + memory / audit log / cost / scorecard     │  + MCP + VS Code ext
          ├─────────────────────────────────────────────┤
          │  ruflo    — orchestration/swarm platform      │  ทางเลือกแทน
          └─────────────────────────────────────────────┘
   ↑ ecc แตะแกนนี้บางส่วน (skill กระจัดกระจาย) · pstack แตะผ่าน `reflect`
   ↑ headroom / rtk เป็น "เครื่องจักร" ลด token ตอน runtime — เสริมแกน B ไม่ใช่ skill
```

**Verticals — เจาะ domain เดียว เสียบข้าง stack ไหนก็ได้:** design · UI · anti-slop · infographic · diagram · business · security · compliance · media

### 1.2 Stack แนะนำทั่วไป

```text
baseline 1 ตัว + process 1 ตัว + SDLC 1 ชุด
                                + vertical เฉพาะงานไม่เกิน 1-2 ชุด
                                + maestro เมื่อเป็น AI/agent workflow
```

### 1.3 กฎสำคัญ

- Layer 0 เปิด global ได้ **ตัวเดียว** — karpathy / caveman / ponytail ต่างสั่งพฤติกรรมพื้นฐานของ agent ซ้อนกันแล้วคำสั่งชนกันเอง
- อย่า stack `addyosmani + ecc` หรือ `orchestkit + ecc` — full-SDLC ทับซ้อนสูง (routing noise)
- อย่าเปิด `superpowers + pstack` เต็มชุดพร้อมกัน — process skill ซ้ำ (tdd, planning, review)
- `aidlc-workflows` เป็น workflow engine ที่คุม process + SDLC ทั้งวงจร — ใช้ **แทน** superpowers/pstack และ SDLC collection ไม่ซ้อน (ติด hook ทุก tool call และตั้ง `Edit(/**)` ในโปรเจกต์ที่ติดตั้ง)
- memory ของ agent เลือกชั้นเดียวต่อโปรเจกต์ (ดู §14.9)
- อย่าเปิด `maestro + ruflo + ECC orchestration` พร้อมกันเป็น baseline
- design direction เลือกตัวเดียว: `taste-skill` หรือ `Hallmark` · product UI เลือกตัวเดียว: `ui-skills` หรือ `ux-ui-agent-skills`
- ถ้าโปรเจกต์/ผู้ใช้มี design-quality rules หรือ frontend-design skill อยู่แล้ว (เช่น `rules/web/design-quality.md`) ให้เลือกฝั่งเดียวเป็นหลัก — อย่าเปิดซ้อนกับ taste-skill / Hallmark / anti-slop / unslop
- `unslop` มี **2 ตัวชื่อซ้ำ**: `heydamir/unslop` (UI) กับ `unslop` ของ pstack (งานเขียน) — ติดตั้งคู่กันต้องเปลี่ยนชื่อโฟลเดอร์/`name` ตัวใดตัวหนึ่งก่อน (§14.6)
- diagram เลือกตัวเดียวต่อโปรเจกต์ · codebase knowledge layer (Graphify / Graft / Understand-Anything) เลือกตัวเดียว
- `reverse-skill` และ `rea` ต้องมี authorization gate + allowlist + sandbox และเลือกตัวเดียว · งาน defensive ทั่วไปใช้ `security-audit-skill` ก่อน
- **security audit workflow เลือกตัวเดียวต่อโปรเจกต์** — `security-audit-skill` · `bug-hunter` · `pya` · `vbsec` · `ghostsecurity` ต่างสั่ง "audit ทั้ง codebase ด้วย sub-agents" เหมือนกัน (§14.8) · `trailofbits` หยิบราย plugin ที่ไม่ซ้ำได้
- pack ของ Hermes (`oh-my-hermes`, `hermes-official-plugins`) ใช้เฉพาะเมื่อ harness คือ Hermes Agent — อย่า port ไป harness อื่น
- MCP/framework/template ไม่ใช่ skill collection แม้ใช้ร่วมกับ agent ได้

**หลักการรวม:** เลือกชุดที่อยู่ **คนละ layer/แกน** ดีกว่าหลายชุดใน layer เดียวกัน — skill ที่ description ซ้ำกันทำให้ router เลือกยากและเปลือง context

---

## 2. เกณฑ์ว่าอะไรนับเป็น Skill Collection

Repository นับเป็น skill collection เมื่อ:

1. มีหนึ่งหรือหลาย `SKILL.md`
2. มี frontmatter อย่างน้อย `name` และ `description`
3. ติดตั้งแล้ว router เลือกโหลดเพื่อเปลี่ยนพฤติกรรม agent ได้
4. มีขอบเขตและ trigger ที่ชัดเจน
5. ไม่ใช่เพียง README, prompt reference, application, framework หรือ MCP server

> จำนวนไฟล์ `SKILL.md` ใน repo **ไม่เท่ากับจำนวน skill** — หลาย repo มี mirror ราย harness (`plugins/` + `skills/`), dev-workflow skill ของ repo เอง หรือ test fixture ปนอยู่ เช่น `ffmpeg-skill` มี 14 ไฟล์แต่ media skill จริงมี 1 ตัว
>
> **ขนาดทั้ง repo ก็ไม่เท่ากับขนาด skill** — สแกน 37 repo (2026-10-16): ตัวที่ `SKILL.md` น้อยกว่า ~3% ของไฟล์ทั้งหมดมีสองแบบ คือ **(ก) product/runtime ขนาดใหญ่** เช่น caveman (1,785 ไฟล์ / 28 `SKILL.md`) · rea (4,057 / 4 — แอป TypeScript) · orchestkit (9,006 / 243) และ **(ข) skill เดี่ยวที่มีตัวอย่าง/asset ปนมาก** เช่น diagram-design (681 / 1) — ห้าตัวนี้จัดจากการเปิดดูองค์ประกอบจริง · WeKnora (5,083 / 5) · Unity-MCP (2,547 / 25) · headroom (2,641 / 0) น่าจะเป็นแบบ (ก) และ Hallmark (286 / 1) น่าจะเป็นแบบ (ข) แต่จัดจากตัวตนที่รู้อยู่ ยังไม่ได้เปิดดู · ตัวเลขอย่างเดียวแยกสองแบบนี้ไม่ได้ — เปิดดูองค์ประกอบแล้วเฉพาะ 5 repo (ตารางเต็มใน `skill-collections-repo-analysis-20261015.md` §8) · **ติดตั้งแบบ skill-only (`npx skills add` หรือ copy เฉพาะโฟลเดอร์ skill) อย่า clone ทั้ง repo เข้า environment ที่มี credential**
>
> **รอบ 10-28 ยืนยันกฎนี้ซ้ำ:** `oh-my-hermes` 277 ไฟล์ = 156 ชื่อไม่ซ้ำ (`skills/` 153 + `agent-skills/` 121 ซ้ำชื่อกันส่วนใหญ่ + `.claude/` 3) · `skill-up` 23 ไฟล์ = **1** skill จริง (ที่เหลือเป็น e2e testdata/examples/fixtures) · `cc-safety-net` 6 ไฟล์ = 1 skill ใช้งาน + 5 dev skill · `trailofbits` 97 ไฟล์ = 95 + fixture 2 · `hyperframes` 26 ไฟล์ = 7 skill หลัก + dev 6 ชื่อ (mirror 2 ที่) + registry block 7 · `awesome-agentic-ai` 408 ไฟล์ = **สำเนา** skill จาก repo อื่น (ตารางเต็มใน `skill-collections-repo-analysis-20261028.md` §2, §6)

### ประเภท

| ประเภท | ความหมาย | การจัดการ |
|---|---|---|
| Core collection | ชุดทั่วไปที่ใช้เป็นฐาน (Layer 0–3) | เลือกอย่างระมัดระวังและ pin version |
| Domain vertical | ชุดเฉพาะชนิดงาน | เปิดเฉพาะเมื่อ task ตรง domain |
| Single skill | skill เดี่ยว | ใช้ได้ แต่ไม่เรียก collection |
| Hybrid pack | skill + CLI/plugin/MCP/framework | ใช้ผ่าน runtime ของผู้ผลิตหรือ pilot แยก |
| Product-specific pack | skill ผูกกับผลิตภัณฑ์/SDK เดียว | ติดตั้งรายโปรเจกต์ |
| Infrastructure | registry/installer/generator | ใช้บริหาร collections ไม่ใช่ content |
| Tool companion | CLI/MCP/service/application | ทำ wrapper skill เมื่อมี use case |
| Reference | ตัวอย่างหรือความรู้ | ไม่ติดตั้งเข้า router โดยตรง |

### คำตัดสิน (ใช้ทั้งเอกสาร)

`Keep` · `Choose one` · `Add selective` (หยิบบาง skill) · `Add opt-in` (เปิดเมื่อสั่ง) · `Restricted` (allowlist + gate) · `Pilot` (ทดลองแยก environment) · `Per-project` · `Companion` · `Reference` · `Excluded`

---

## 3. ตารางเปรียบเทียบหลัก

### 3.0 ตัวเลขและสถานะการ verify (แหล่งเดียวของตัวเลขในเอกสาร)

**ตรวจผ่าน GitHub API (search API แบบ batch) + release feed (`releases.atom`)** — คอลัมน์ "ตรวจ" คือวันที่ของตัวเลขแถวนั้น · ⭐ ตามด้วย **(+x%)** เมื่อโตตั้งแต่ ~15% ขึ้นไปจากรอบ 11-04 (ห่าง 7 วัน) · 🆕 = เข้า catalog รอบ 11-04 (รอบนี้เป็น refresh ตัวเลขอย่างเดียว ไม่มีตัวใหม่) · pushed ที่เป็นตัวหนา = เงียบเกิน ~3 เดือน · **refresh ทุกแถว 2026-11-11 ~10:44 (เวลาไทย)**

> **วันที่ตั้งแต่รอบนี้เป็นเวลาไทย (UTC+7)** — รอบก่อนบันทึกเป็นวันที่ UTC จึงบางแถวต่างกัน 1 วันโดยไม่มี push ใหม่ (`olmocr` 03-25→03-26 · `security-audit-skill` 09-14→09-15 · `Privacy` 03-16→03-17 · `founder-skills` 05-18→05-19) · คอลัมน์ release ใหม่ในรอบนี้: tag ล่าสุดจาก `releases.atom` (**รวม prerelease/nightly** — เช่น aidlc เป็น `-preview`) วันที่ในวงเล็บเป็นวันที่ของรายการใน feed ไม่ใช่วันที่ tag ถูกสร้าง · repo ที่ไม่มี GitHub Release ใส่ `—`

| Repository | ⭐ | License | pushed ล่าสุด | release ล่าสุด | ตรวจ |
|---|---:|---|---|---|---|
| morluto/rea | 450,361 | MIT | 2026-11-11 | rea-agents-6.8.0 (10-25) | 11-11 |
| awesome-selfhosted/awesome-selfhosted | 335,864 | CC-BY-SA-3.0 (ไฟล์ LICENSE — API ตอบ NOASSERTION) | 2026-11-07 | 1.0.0 (2023-09-05) | 11-11 |
| mattpocock/skills | 321,068 | MIT | 2026-11-09 | v1.3.2 (10-29) | 11-11 |
| obra/superpowers | 315,805 | MIT | 2026-11-04 | v7.0.2 (11-04) | 11-11 |
| affaan-m/ECC | 300,861 | MIT | 2026-11-09 | v2.2.3 (10-02) | 11-11 |
| multica-ai/andrej-karpathy-skills | 231,914 | MIT ตาม README (**ไม่มีไฟล์ LICENSE**) | **2026-04-20** | — | 11-11 |
| DietrichGebert/ponytail | 188,479 | MIT | 2026-10-29 | v5.3.3 (10-29) | 11-11 |
| JuliusBrussee/caveman | 118,928 | Apache-2.0 (เฉพาะ ≥ 3.0.0 — ก่อนหน้านั้น MIT + BSL 1.1) | 2026-11-11 | v4.1.0 (11-08) | 11-11 |
| addyosmani/agent-skills | 115,267 | MIT | 2026-11-02 | 0.6.15 (10-31) | 11-11 |
| Leonxlnx/taste-skill | 113,051 | MIT | 2026-11-09 | v2.5.1 (11-07) | 11-11 |
| tt-a1i/archify | 95,416 | **Apache-2.0 (เปลี่ยนจาก MIT 2026-10-25 — §5.5)** | 2026-11-11 | archify-dsh-v1.1.0 (11-08 · DSH pack — ตัวหลักล่าสุดยัง v3.2.0 10-19) | 11-11 |
| rtk-ai/rtk | 86,135 | Apache-2.0 | 2026-11-11 | dev-1.2.1-rc.628 (11-10 · prerelease — stable ล่าสุด v1.2.0 11-08) | 11-11 |
| heygen-com/hyperframes | 82,379 | Apache-2.0 | 2026-11-11 | v0.9.32 (11-11) | 11-11 |
| ruvnet/ruflo | 81,445 | MIT | 2026-11-11 | v3.75.3 (11-11) | 11-11 |
| headroomlabs-ai/headroom | 79,323 | Apache-2.0 | 2026-11-11 | v0.44.0 (11-10) | 11-11 |
| cloudflare/security-audit-skill | 69,448 (**+19%**) | MIT | 2026-09-15 | — | 11-11 |
| shanraisshan/claude-code-best-practice | 68,952 | MIT | 2026-11-11 | — | 11-11 |
| cathrynlavery/diagram-design | 66,356 | MIT | 2026-11-11 | — | 11-11 |
| HKUDS/CLI-Anything | 58,563 | Apache-2.0 | 2026-09-22 | v0.4.0 (06-25) | 11-11 |
| Nutlope/hallmark | 52,713 | MIT | 2026-11-11 | — | 11-11 |
| alibaba/open-code-review | 49,806 | Apache-2.0 | 2026-11-11 | v1.13.7 (11-10) | 11-11 |
| anthropics/claude-plugins-official | 46,792 | Apache-2.0 | 2026-11-11 | — | 11-11 |
| zhaoxuya520/reverse-skill | 44,437 | MIT | 2026-09-22 | v1.0.1 (08-08) | 11-11 |
| VectifyAI/PageIndex | 40,351 | MIT | 2026-11-10 | v0.5.3 (11-06) | 11-11 |
| virgiliojr94/book-to-skill | 37,554 | MIT | 2026-11-09 | v1.4.0 (08-11) | 11-11 |
| Tencent/WeKnora | 37,126 | **other** (API ตอบ NOASSERTION) | 2026-11-09 | v0.9.0 (10-29) | 11-11 |
| baidu/Unlimited-OCR | 31,082 | MIT | 2026-11-09 | UnlimitedOCR1.0 (10-23) | 11-11 |
| pranshuparmar/witr | 22,978 | Apache-2.0 | 2026-10-23 | v0.3.4 (10-05) | 11-11 |
| allenai/olmocr | 19,820 | Apache-2.0 | **2026-03-26** | v0.4.27 (03-12) | 11-11 |
| memvid/memvid | 17,393 | Apache-2.0 | **2026-07-14** | v2.0.140 (05-28) | 11-11 |
| cursor/plugins (pstack) | 15,973 | MIT (`pstack/LICENSE`, Lauren Tan — root ไม่มี LICENSE, API ตอบ null) | 2026-11-11 | — | 11-11 |
| heydamir/unslop | 13,849 (**+82%**) 🆕 | CC-BY-4.0 (ต้องให้เครดิต) | 2026-11-09 | — | 11-11 |
| petergyang/no-ai-slop | 13,367 | MIT | 2026-09-02 | v1.0.6 (08-01) | 11-11 |
| yizhiyanhua-ai/fireworks-tech-graph | 11,972 | MIT | 2026-10-21 | v1.2.0 (07-17) | 11-11 |
| ibelick/ui-skills | 10,943 | MIT | 2026-11-07 | v0.2.3 (06-22) | 11-11 |
| PDFCraftTool/pdfcraft | 9,818 | **AGPL-3.0** | 2026-11-08 | v2026.11.08-98e89d4 (11-08) | 11-11 |
| miqdadbadjuber/anti-slop | 8,892 | MIT | 2026-11-10 | v3.2.28 (11-10) | 11-11 |
| trailofbits/skills | 8,118 | **CC-BY-SA-4.0** (share-alike) | 2026-11-06 | — | 11-11 |
| anthropics/defending-code-reference-harness | 7,730 | Apache-2.0 (ไฟล์ LICENSE — API ตอบ NOASSERTION) | **2026-08-07** | — | 11-11 |
| antvis/Infographic | 7,087 | MIT | 2026-10-20 | 0.2.19 (05-06) | 11-11 |
| ScrapeCreators/social-media-research-skills | 6,216 (**+15%**) | MIT | 2026-08-27 | — | 11-11 |
| awslabs/aidlc-workflows | 6,006 | MIT-0 | 2026-11-11 | v2.11.4-preview.20261110.1 (11-11) | 11-11 |
| rlaope/oh-my-hermes | 5,391 | MIT | 2026-11-11 | omher-v0.2.3 (11-11 · omher pack — ตัวหลักล่าสุด v4.0.7 11-09) | 11-11 |
| kajisho5/ffmpeg-skill | 5,027 | MIT | 2026-11-11 | v3.3.0 (11-11) | 11-11 |
| IvanMurzak/Unity-MCP | 4,615 | Apache-2.0 | 2026-11-11 | 1.10.0 (11-10) | 11-11 |
| michael-denyer/pstack-claude | 4,216 | MIT | 2026-11-11 | v0.9.135 (11-11) | 11-11 |
| agentscope-ai/ReMe | 3,785 | Apache-2.0 | 2026-11-11 | v0.4.2.2 (11-05) | 11-11 |
| plugin87/ux-ui-agent-skills | 3,155 | MIT | 2026-11-10 | v3.1.0 (11-10) | 11-11 |
| typesafe-ai/skills | 2,892 | MIT | 2026-10-24 | v0.6.2 (10-24) | 11-11 |
| kenryu42/cc-safety-net | 1,992 | MIT | 2026-11-11 | v2.7.9 (11-11) | 11-11 |
| tracewayapp/traceway | 1,766 | MIT | 2026-11-11 | cli/v2.0.10 (11-10) | 11-11 |
| alibaba/skill-up | 1,452 | Apache-2.0 | 2026-11-09 | v0.15.0 (11-09) | 11-11 |
| ognjengt/founder-skills | 670 | MIT | **2026-05-19** | — | 11-11 |
| NousResearch/hermes-official-plugins | 650 | MIT | 2026-11-10 | — | 11-11 |
| sharpdeveye/maestro | 602 | MIT | **2026-04-29** | v2.0.0 (04-26) | 11-11 |
| codexstar69/bug-hunter | 557 | MIT | 2026-10-30 | v3.2.1 (10-30) | 11-11 |
| Lifecycle-Innovations-Limited/claude-ops | 551 | MIT | 2026-11-10 | v3.12.1 (11-02) | 11-11 |
| ghostsecurity/skills | 441 | Apache-2.0 | 2026-09-28 | — | 11-11 |
| agamm/claude-code-owasp | 438 | MIT | 2026-11-04 | — | 11-11 |
| syahiidkamil/Software-Engineer-AI-Agent-Atlas | 406 | **ไม่มี** | 2026-11-01 | v3.0.0 (11-01) | 11-11 |
| mukul975/Privacy-Data-Protection-Skills | 336 | Apache-2.0 | **2026-03-17** | v1.0.0 (03-16) | 11-11 |
| tanviet12/vbsec | 328 | MIT | 2026-09-28 | — | 11-11 |
| yonatangross/orchestkit | 301 | MIT | 2026-11-11 | v10.10.8 (11-09) | 11-11 |
| AgriciDaniel/pya | 277 | MIT | 2026-10-23 | v2.0.0 (10-23) | 11-11 |
| jrenaldi79/harness-engineering | 126 | MIT | 2026-11-10 | v1.4.0 (11-03) | 11-11 |
| I-CAN-hack/pdf-mcp | 82 | MIT | 2026-10-19 | — | 11-11 |

> ⚠️ **maintenance cadence ต้องเข้าไปอยู่ในการตัดสิน choose-one** ไม่ใช่ดูเนื้อหาอย่างเดียว (นับถึง 2026-11-11):
> - เงียบนาน (ไม่มี push เกิน 60 วัน): `Privacy-Data-Protection-Skills` (~7.9 เดือน) · `olmocr` (~7.6 เดือน) · `karpathy-skills` (~6.7 เดือน) · `maestro` (~6.4 เดือน) · `founder-skills` (~5.8 เดือน) · `memvid` (~3.9 เดือน) · `defending-code-reference-harness` (~3.2 เดือน · README ประกาศเองว่า **not maintained** · **ข้ามเกณฑ์ตัวหนา ~3 เดือนเป็นครั้งแรก**) · `social-media-research-skills` (~2.5 เดือน) · `no-ai-slop` (~2.3 เดือน) — ไม่มีตัวใหม่เข้ากลุ่มนี้ · `security-audit-skill` เงียบ 57 วัน (ใกล้ 60 · ยังไม่มี push ตั้งแต่ 09-15)
> - community เล็ก (⭐ ต่ำกว่า ~600): `claude-ops` · `bug-hunter` · `Atlas` · `Privacy-Data-Protection-Skills` · `orchestkit` · `pdf-mcp` · `ghostsecurity/skills` · `claude-code-owasp` · `vbsec` · `pya` · `harness-engineering` — **`maestro` (602) และ `hermes-official-plugins` (650) พ้นเกณฑ์แล้ว** · `founder-skills` (670) อยู่นอกเกณฑ์ต่อ
> - **ดาวพุ่งผิดปกติ (เทียบ 11-04 · 7 วัน):** `unslop` +82% (7,602 → 13,849 · มี push 11-09) · `security-audit-skill` +19% (58,255 → 69,448) **โดยไม่มี push ใหม่ตั้งแต่ 09-15** · `social-media-research-skills` +15% (5,399 → 6,216) โดยไม่มี push ตั้งแต่ 08-27 — ใกล้เกณฑ์: `ffmpeg-skill` +13% · `hallmark` +12% — ดาวไม่ใช่ตัวชี้วัดคุณภาพ และยิ่งไม่ใช่เมื่อโตเร็วผิดปกติ
> - ดาวไม่ใช่ตัวชี้วัดคุณภาพ — moat ของ maestro (memory/audit/cost/scorecard) ยังไม่มีใครแทน แต่ควรรู้ว่าเสี่ยงหยุดพัฒนา
> - **เวอร์ชันที่ออกหลังรอบ 11-04:** ไม่มี major ของบรรทัดหลัก · notable minor — `rtk` stable **v1.2.0** (เดิม v1.1.0 · feed ล่าสุดยังเป็น prerelease `dev-1.2.1-rc.628`) · `Unity-MCP` 1.6.0 → **1.10.0** · `taste-skill` v2.1.5 → **v2.5.1** · `ffmpeg-skill` v3.1.1 → **v3.3.0** · `orchestkit` v10.7.4 → v10.10.8 · `caveman` **v4.1.0** · `oh-my-hermes` ตัวหลัก v4.0.5 → **v4.0.7** (feed ล่าสุดเป็น pack ใหม่ `omher-v0.2.3`) · `hyperframes` v0.9.9 → v0.9.32 · `ruflo` v3.71.0 → v3.75.3 · `headroom` v0.44.0 · `skill-up` v0.15.0 · `ux-ui-agent-skills` v3.1.0 · `PageIndex` v0.5.3 · `open-code-review` v1.13.7 · `anti-slop` v3.2.28 · `cc-safety-net` v2.7.9 · `pstack-claude` v0.9.135 · `aidlc-workflows` v2.11.4-preview · `traceway` cli/v2.0.10 · `ReMe` v0.4.2.2 · `pdfcraft` v2026.11.08 · `archify` ตัวหลักยัง v3.2.0 (feed ล่าสุดเป็น pack `archify-dsh-v1.1.0`) — **pin ที่เอกสารอ้างไว้ต้องตรวจซ้ำก่อนติดตั้ง**
> - **ไม่มี repo ใน §3.0 ถูก archive / rename / ลบ** · license ไม่เปลี่ยน (API ตอบเหมือน 11-04 ทุกตัว) · ใน §21: `CCPlugins` ยังอยู่ที่ `brennercruvinel/CCPlugins` และ **archived** (เงียบ 61 วัน) · `agent-console` / `omniget` ยัง 404

**ยังไม่ verify:**

| ข้อมูล | สถานะ |
|---|---|
| จำนวน skill ของ 7 core collections เดิม | นับครั้งล่าสุด 2026-07-12 — ใช้เป็นตัวเลขโดยประมาณ · รอบ 10-28 นับซ้ำเฉพาะ ux-ui-agent-skills · diagram-design · security-audit-skill |
| superpowers v7 / ux-ui v3 เปลี่ยนอะไร (breaking change, ชื่อ skill, hooks) | ยังไม่ได้อ่าน release notes |
| เหตุผลเต็มของ archify ที่เปลี่ยน license | เห็นแค่ข้อความ commit `license: adopt Apache-2.0 while preserving historical MIT grants` |
| License ของ companions เดิม 18 รายการ | ยังเป็น `ต้องตรวจ` |
| Commit hash ของ candidate ทุกตัว (รวม 19 ตัวรอบ 10-28) | ยังไม่ pin |
| frontmatter นอก 13 ไฟล์ + caveman 22 + ponytail 6 + 17 ไฟล์รอบ 10-28 ที่ audit แล้ว | ยังไม่ audit |
| hooks ของ caveman บน Codex/Cursor (`.codex/hooks.json`, `hooks/hooks-cursor.json`) | มีไฟล์แต่ยังไม่ได้อ่านเนื้อหา |
| ค่าเริ่มต้นแน่ชัดของ routing ใน `caveman setup` · payload ของ **routing** จริง (`proxy/internal/gateway/route.go`, `cloudlink/link.go`) ว่าส่งตรงกับข้อความที่ CLI ประกาศหรือไม่ · `provider-logins.ts` | ยังไม่ได้อ่าน (telemetry ฝั่ง `events.go` ตรวจแล้ว — ตรงกับที่ประกาศ) |
| hooks ของ ponytail บน Copilot/Cursor/Qoder | ยังไม่ได้อ่าน (อ่านเฉพาะ `ponytail-activate.js` ฝั่ง Claude/Codex) |
| aidlc-workflows: ไฟล์ที่ติดตั้งจริงต่างจาก template ใน repo หรือไม่ (`bun` vs `aidlc`) · เนื้อ native binary · `engine hook *` ทำอะไรกับข้อมูล `record-human-turn` | อ่านแค่ README · install guide (คีย์เวิร์ด) · `harness/claude/settings.json` + `.mcp.json` · SKILL.md 2 ตัวบางส่วน |
| CLI-Anything: คุณภาพ/ความปลอดภัยรายตัวของ harness จากชุมชน · สคริปต์ของ `cli-hub` | อ่านแค่ README ส่วนต้น + sample `blender` SKILL.md |
| ReMe: โค้ด `auto_memory.py` (hook ที่จับบทสนทนา) · `mcp_bridge.py` · ข้อมูลที่ส่งออกจริงเมื่อเปิด `auto_memory` | อ่านแค่ README ส่วนต้น + `skills/reme_memory/SKILL.md` + รายการไฟล์ integration |
| path ที่ hooks ของ orchestkit เขียนจริง (`mkdirSync` ใน `first-run-setup.ts` ฯลฯ) และต้นทางของการเขียน "rules file" ที่เห็นใน bundle | ยังไม่ได้ตรวจ (อ่านแค่ 5 ไฟล์จาก 7 ใน `src/hooks/src/setup/`) |
| เนื้อ `archify.zip` (5 MB) ใน repo archify | ยังไม่ได้เปิดดู |
| องค์ประกอบของ repo ที่ `SKILL.md` < 3% อีก ~11 ตัว | เปิดดูแล้วเฉพาะ caveman · rea · orchestkit · diagram-design · archify (repo-analysis 10-15 §8) |
| **รอบ 11-04:** unslop — ยังไม่ได้รัน `snapshot.mjs` / `story.mjs` จริง · ยังไม่ได้ทดสอบกับ image MCP · อ่าน `SKILL.md` + `references/*.md` + scripts ทั้งสองไฟล์ครบแล้ว | ดู `skill-collections-repo-analysis-20261104.md` |
| **รอบ 10-28:** โค้ด hook ของ `cc-safety-net` · threat feed ของ `pya` · scripts ของ `bug-hunter` · binary ของเครื่องมือ Ghost (Poltergeist/Wraith ฯลฯ) · การส่งข้อมูลของ ScrapeCreators API · telemetry ของ agent-orchestrator · license ของ skill ที่ vendor มาใน awesome-agentic-ai | อ่านแค่ README + frontmatter ตัวอย่าง — รายละเอียดใน `skill-collections-repo-analysis-20261028.md` §5 |

### 3.1 ตารางเปรียบเทียบ 7 core collections เดิม

| มิติ | karpathy | superpowers | mattpocock | addyosmani | ecc | maestro | taste-skill |
|------|----------|-------------|------------|------------|-----|---------|-------------|
| **แกน** | A (baseline) | A (process) | A | A | A (+แตะ B) | **B** | **A (vertical: frontend design)** |
| **จำนวน** | 1 skill | ~14 | ~35 | 24 | หลายร้อย (skills+agents+commands) | 1 core + 24 cmd + MCP (10 tools) + VS Code ext | 13 (1 หลัก + 12 เสริม) |
| **ตัวตน** | กฎลด LLM mistakes | วินัยกระบวนการ | เครื่องมือคิดวิศวกรรม | playbook ครบ SDLC | framework/marketplace ครบจักรวาล | toolkit วิศวกรรมเวิร์กโฟลว์ของ AI agent | anti-slop design taste |
| **ปรัชญา** | think→simple→surgical→verify | skill-first, rigid | small/composable, anti-vibe-coding | production-grade | ครอบคลุม + เฉพาะทาง | structure > improvisation · measure don't assume | Design Read → 3 Dials · anti-default |
| **จุดเด่น** | surgical changes, goal-driven | systematic-debugging, plans, worktrees | grilling, codebase-design, PRD→issues | doubt-driven, source-driven | domain packs, ภาษา, orchestration | diagnose→fix, memory/audit/cost, `/reflect` | 3 Dials + preset, style variants, imagegen→code |
| **จุดอ่อน** | แคบ | ไม่มี domain/ภาษา | เอน TS | ทับ ecc เกือบหมด | ใหญ่จนเลือกยาก | ไม่แตะ SDLC/โค้ดแอป; ต้อง `/teach-maestro` | ตัวหลัก ~87KB; เฉพาะ marketing pages |
| **เหมาะเมื่อ** | ทุกโปรเจกต์ | งาน eng จริงจัง | อยากคุมกระบวนการคิด | อยากได้ playbook สำเร็จรูป | โปรเจกต์ใหญ่/หลายภาษา | สร้างหรือจูน agent workflow | landing/portfolio/redesign |

### 3.2 ตารางเปรียบเทียบ core candidates ใหม่ (รอบ 2026-10-15)

| มิติ | caveman | ponytail | pstack | orchestkit |
|---|---|---|---|---|
| **Layer** | 0 (baseline) | 0 (baseline) | 1 (process) + แตะแกน B | 2 (SDLC) |
| **แข่งกับ** | karpathy · ponytail | karpathy · caveman | superpowers (+ maestro เฉพาะ `reflect`) | ecc · addyosmani |
| **ขนาด** | 22 skills ไม่ซ้ำ (28 ไฟล์) ใน monorepo ~1,785 ไฟล์ | 6 skills ไม่ซ้ำ (13 ไฟล์) | ~50 dirs (Cursor) · 61 ไฟล์ (port) | 106 skills · 171 hooks ตาม README |
| **องค์ประกอบเสริม** | `commands/*.toml` · `agents/` · plugin Claude/Cursor/Codex/Gemini · hooks 3 ตัว · installer แก้ `settings.json` · proxy/engine (Go) | hooks (Claude/Codex · Copilot · Cursor · Qoder) · plugin v5.2.0 · ฉีด codebase map (release ล่าสุด v5.3.2 · 10-17) | playbooks · principles · scripts | hooks จำนวนมาก · plugin ราย harness |
| **สถานะ** | Pilot (baseline ทางเลือก) | Pilot (baseline ทางเลือก) | Choose one กับ superpowers · หยิบราย skill | Choose one กับ ecc |
| **ความเสี่ยงหลัก** | เสียงตอบสั้นแบบ persistent ทับ instruction โปรเจกต์ · กลุ่ม Caveman Cloud ส่ง LLM request ผ่าน gateway | hooks รันทุก session/prompt · ฉีด codebase map · ทิ้ง comment `shortcut:` ในโค้ด | 50 skills ชน process skill เดิม | hooks side effects · community เล็ก |

### 3.3 ตารางเปรียบเทียบ verticals

| Vertical | Domain | รูปแบบ | สถานะ | ชนกับ | ความเสี่ยงหลัก |
|---|---|---|---|---|---|
| founder-skills | business / GTM / pricing / SOP | collection ~9 กลุ่ม | Add selective (3-6 skills) | ECC business · taste-skill (CRO/copy) | claims ต้อง verify · `FOUNDER_CONTEXT.md` อ่อนไหว |
| ui-skills | product UI / a11y / motion | collection + CLI (~7–9 skills) | Add opt-in | **ux-ui-agent-skills** · taste-skill | rules `MUST`/`NEVER` ชน design system |
| ux-ui-agent-skills | design system / a11y / Figma / QA gate | collection 26 skills (+1 fixture) · **v3.0.0** | Choose one กับ ui-skills | ui-skills · taste-skill | major v3 — ยังไม่อ่าน breaking change · 34 gates เปิด browser จริง |
| taste-skill · Hallmark | landing / portfolio / redesign | collection 13 · single | Choose one | anti-slop (UI) · ux-ui | taste-skill ตัวหลัก ~87KB |
| anti-slop | anti-slop UI / code / copy | collection 6 | Add selective | taste-skill/Hallmark (UI) · no-ai-slop (text) | `copywriting`/`human` ทับ no-ai-slop |
| no-ai-slop | anti-slop text | single | Add selective | anti-slop (text skills) | — |
| unslop (heydamir) 🆕 | redesign UI ที่ดูเป็น AI (audit → direction → 9 passes) | single + scripts Node 2 ตัว | Pilot · Choose one (UI) | antislop-ui · taste-skill/Hallmark · ui-skills · pstack `unslop` (ชื่อซ้ำ) | `SKILL.md` 31 KB · image gen เสียเงิน (ถามก่อนทุกครั้ง) · repo อายุ ~6 วัน |
| Infographic | data storytelling | renderer + skill pack ~5 | Add selective | diagram (ต่ำ) · taste-skill | ผูก DSL/renderer version |
| archify · fireworks · diagram-design | technical diagram | hybrid · hybrid · single | Choose one | Infographic (ต่ำ) | ดู §5.5 |
| security-audit-skill | defensive audit | single (Cloudflare) | Add selective | ECC security · Addy hardening · กลุ่ม audit 10-28 | — |
| trailofbits/skills | security research / audit / secure dev | marketplace 44 plugins · 95 skills | Add selective ราย plugin | security-audit-skill · ECC security | **CC-BY-SA-4.0** · ใหญ่ |
| bug-hunter · pya · vbsec · ghostsecurity | audit codebase ด้วย sub-agents | 11 · 1 · 1 (×3 mirror) · 8 | Choose one กับ security-audit-skill (Pilot) | security-audit-skill · กันเอง | community เล็ก · ดู §5.6.1 |
| claude-code-owasp | OWASP knowledge ตอนเขียน/รีวิว | single | Add opt-in | Addy `security-and-hardening` · ECC `security-review` | auto-trigger กว้าง |
| social-media-research-skills | creator/ads/audience research | collection 13 | Add opt-in | founder-skills (GTM) | ต้องมี API key เสียเงิน · ข้อมูลส่งไป ScrapeCreators |
| reverse-skill · rea | reverse engineering / pentest | router pack · 1 skill + dev skills | Restricted · choose one | ECC security | dual-use · tool bootstrap |
| Privacy-Data-Protection-Skills | GDPR / CCPA / EU AI Act / HIPAA ฯลฯ | collection 824 ไฟล์ | Add selective ราย jurisdiction | ECC `hipaa-compliance` `healthcare-phi-compliance` | ใหญ่มาก · เงียบ ~7 เดือน |
| ffmpeg-skill | media / video | single + 42 scripts + MCP | Add selective | — | — |

---

## 4. Core Collections

> ⭐ / license / วันที่ push ของทุกชุดดู §3.0

### 4.1 karpathy — `multica-ai/andrej-karpathy-skills` · Layer 0

- 1 skill (`karpathy-guidelines`) ~2.5KB · **4 หลักการ:**
  1. **Think Before Coding** — บอก assumption, ถามเมื่อไม่ชัด
  2. **Simplicity First** — โค้ดน้อยสุดที่แก้ปัญหา ไม่เก็งอนาคต
  3. **Surgical Changes** — แตะเฉพาะที่จำเป็น
  4. **Goal-Driven** — นิยาม success criteria ที่ verify ได้ แล้ว loop
- เหมาะกับทุกโปรเจกต์ — **leverage ต่อ token สูงสุดในกลุ่ม** · ให้ user/project instructions มีลำดับสูงกว่าเสมอ
- ข้อควรรู้: README ระบุ MIT แต่ **repo ไม่มีไฟล์ LICENSE** และ push ล่าสุดเมื่อ ~6 เดือนก่อน (§3.0) — ไฟล์เล็กและเป็นพฤติกรรมล้วน ผลกระทบต่ำ แต่ถ้าจะฝังในผลิตภัณฑ์หรือแจกจ่ายให้ทีม ควรขอ license ที่ชัดเจนจากเจ้าของก่อน

### 4.2 caveman — `JuliusBrussee/caveman` · Layer 0 (ทางเลือก — Pilot)

- 22 skills ไม่ซ้ำ (28 ไฟล์ = mirror 6) — **ไม่ใช่แค่ "ตอบสั้น"** (audit frontmatter แล้ว 2026-10-16) แบ่งเป็น 4 กลุ่ม (จัดกลุ่มโดยผู้จัดทำจาก `description` — upstream ไม่ได้แบ่งแบบนี้):
  - **เสียงตอบสั้น (persistent):** `caveman` · `ultracave` · `megacave` (文言文) · `caveman-commit` · `caveman-review` · `caveman-help` · `caveman-stats` — เปิดแล้ว "stays on until stop caveman / normal mode" · trigger กว้าง เช่น "be brief" "less tokens"
  - **ย่อ input / มอบงาน subagent:** `caveman-compress` (ย่อ CLAUDE.md/todo เป็นรูปแบบ caveman — **ส่งข้อความไฟล์ไปยัง model provider**) · `cavecrew` + `caveman-explore` (ให้ subagent investigator/builder/reviewer ทำงานแทน เพื่อให้ context หลักยาวขึ้น)
  - **วินัยงานวิศวกรรม:** `investigate-first` · `lean-build` · `migration` · `safe-refactor` · `surgical-patch` · `verify-and-stop` — ทับกับ karpathy / superpowers / addyosmani
  - **Caveman Cloud (บริการภายนอก):** `caveman-setup` (ต่อ repo ผ่าน **gateway เพื่อวัดทุก LLM request**) · `caveman-discover` · `caveman-evidence-review` · `caveman-manage` · `caveman-optimize` · `caveman-learn` — เป็น observability/experiment ที่มี data egress ไม่ใช่ baseline
- **repo นี้เป็น product monorepo (~1,785 ไฟล์) ไม่ใช่ skill collection ล้วน** (ตรวจ 2026-10-16): skills เป็นแค่ 1 surface · ที่เหลือคือ `proxy/` + `engine/` (Go — runtime/gateway) · `packages/` (CLI/SDK) · `extension/` · `mcp/` · `mem/` · `shrink/` · `browse/` · `installer/` · `supabase/`
- **plugin/commands/agents (ตรวจจากไฟล์ใน repo):** manifest ของ Claude (`.claude-plugin/` + marketplace) · Cursor · Codex (`plugins/caveman/.codex-plugin/`) · Gemini (`gemini-extension.json`) · `commands/*.toml` 5 ตัว · `agents/cavecrew-{investigator,builder,reviewer}.md` + profiles ราย harness (aider · claude · codex · gemini · hermes · kilo · openclaw · opencode · pi · qwen)
- **hooks (อ่าน `src/hooks/README.md`):** `SessionStart` (ทุก source) ฉีด skill ของ mode ที่ active เข้า context และฉีดซ้ำหลัง compaction · `SubagentStart` ส่ง mode ให้ subagent · `UserPromptSubmit` ตรวจ "/caveman" "talk like caveman" "stop caveman" แล้วฉีด reminder ทุก turn · เก็บ mode ต่อ session ที่ `~/.claude/.caveman-sessions/<session_id>.mode` + mirror `.caveman-active` · ลบไฟล์ session ที่เก่ากว่า 14 วัน · session headless (`claude -p`, Agent SDK) เริ่มแบบปิด · Codex และ Cursor มีไฟล์ hooks ของตัวเอง (`.codex/hooks.json`, `hooks/hooks-cursor.json`) แต่ยังไม่ได้อ่านเนื้อหา
- **installer (อ่านโค้ด 2026-10-16 — รายละเอียดเต็มใน `skill-collections-repo-analysis-20261015.md` §10.1):** ติดตั้งให้ทุก host ที่ตรวจเจอในเครื่อง · แก้ `settings.json` แบบ atomic/idempotent และลบเฉพาะ hook ของตัวเอง แต่ comment ในไฟล์ไม่รอด · curl-pipe ดึง git tag (`v4.0.1` — ณ 10-28 มี `bin-v4.0.2` แล้ว) ที่ย้ายได้ — **ควร pin SHA** · หลังติดตั้งรัน `@caveman-ai/cli setup` ต่อ · สแกนไม่พบโค้ด telemetry/credentials ใน installer · **รัน `--dry-run --non-interactive` และ `--only claude` ก่อน** หรือใช้ plugin marketplace แทน
- **Caveman Cloud (อ่าน CLI + `proxy/internal/cloudlink/events.go` — รายละเอียดเต็มใน repo-analysis 10-15 §10.2):** **routing** (Auto) ส่งคำสั่งล่าสุด + ก่อนหน้า + ท้ายคำตอบของ agent + ข้อมูล request ไปยัง `api.caveman.so` และ **Free plan อาจเก็บไว้** (ตามที่ upstream ประกาศ — payload จริงยังไม่ได้ตรวจจากโค้ด) · ปิดด้วย `caveman off routing` · **runtime telemetry** ส่งเฉพาะเมื่อ sign-in แล้ว เป็น opt-out (`telemetry.enabled=false` / `DO_NOT_TRACK` / `CAVEMAN_TELEMETRY=0`) และ struct ไม่มีฟิลด์ข้อความ prompt (ยืนยันจากโค้ด) · ค่าเริ่มต้นตอน `setup` ยังยืนยันไม่ได้ → ใช้ `caveman setup --dry-run` · environment ที่มีโค้ด/prompt ลับ: อย่าเปิด routing บน Free plan และตั้ง telemetry เป็น off
- **license:** Apache-2.0 สำหรับ **v3.0.0 ขึ้นไป** (ก่อนหน้านั้นแยก MIT + BSL 1.1 ในส่วน engine/proxy/mcp ฯลฯ) · **Caveman Cloud เป็นบริการเชิงพาณิชย์แยก ซอร์สไม่อยู่ใน repo** → pin เวอร์ชัน ≥ 3.0.0
- คำแนะนำ: **Pilot — ติดตั้งเฉพาะกลุ่ม "เสียงตอบสั้น" (+ `cavecrew` ถ้าต้องการ)** · **อย่าเปิดกลุ่ม Caveman Cloud** จนกว่าจะรีวิว data policy ของ gateway · อย่าเปิดคู่ karpathy/ponytail · เสียงตอบสั้นแบบ persistent จะชนกับ project instructions ที่กำหนดภาษา/รูปแบบคำตอบ (เช่น ให้ตอบเป็นภาษาไทยพร้อมอธิบายละเอียด)

### 4.3 ponytail — `DietrichGebert/ponytail` · Layer 0 (ทางเลือก — Pilot)

- 6 skills ไม่ซ้ำ (13 ไฟล์ = `skills/` 6 + mirror `.openclaw/skills/` 6 + benchmark fixture `benchmarks/arms/caveman-SKILL.md` 1 ซึ่งเป็นสำเนาของ caveman) · plugin v5.2.0 (ตรวจ 10-16 — release ล่าสุด v5.3.2 · 10-17)
- **ปรัชญา** (audit frontmatter 2026-10-16): "Lazy senior dev mode" — การเปลี่ยนที่เล็กที่สุดที่แก้ปัญหาได้ครบ + คำตอบที่คนยุ่งอ่านรอบเดียวเข้าใจ · plugin ระบุ "YAGNI, stdlib first, no unrequested abstractions" · trigger กว้าง: ทุกงาน coding (เขียน แก้ refactor review เลือก dependency) และคำว่า "be lazy" · ใกล้เคียง karpathy ข้อ Simplicity/Surgical มาก
- skills: `ponytail` (mode) · `ponytail-review` (review change — อ่านโค้ดที่เชื่อมกัน ไม่ใช่แค่ diff) · `ponytail-audit` (audit ทั้ง repo — one-shot ไม่แก้ไฟล์) · `ponytail-debt` (รวบรวม comment `shortcut:` เป็น debt ledger) · `ponytail-gain` (แสดงผล benchmark) · `ponytail-help`
- **พฤติกรรมที่ mode บังคับ (อ่าน `SKILL.md`):** active ทั้ง session จนกว่าจะพิมพ์ "stop ponytail" / "normal mode" · มี 3 ระดับ (`lite` / `full` ค่าเริ่มต้น / `ultra` ที่ตั้งคำถามกับคำขอก่อนสร้าง) · ตอบจบด้วย 1–2 บรรทัดว่าข้ามอะไรและมีความเสี่ยงอะไร · เพิ่ม logic ที่ไม่ trivial ต้องทิ้ง test หรือ assert เล็ก ๆ · **ทิ้ง comment รูปแบบ `shortcut: <ข้อจำกัด>, <เมื่อไรต้องอัปเกรด>` ในโค้ดเมื่อเลือกทางลัด** (ยืนยันแล้ว — `ponytail-debt` เป็นตัวรวบรวม และเขียนไฟล์ `PONYTAIL-DEBT.md` เฉพาะเมื่อสั่ง)
- **hooks (อ่านสคริปต์ฝั่ง Claude/Codex):** `SessionStart` (startup · resume · clear · compact) + `SubagentStart` + `UserPromptSubmit` รัน node script (timeout 5s) · `ponytail-activate.js` เขียนไฟล์ flag `~/.claude/.ponytail-active` และ `.ponytail-statusline-nudged` · **อ่าน** `settings.json` เพื่อตรวจ statusline แล้ว nudge ให้ Claude ช่วยตั้งค่า (ไม่ได้แก้เอง) · ฉีด **codebase map** (รายชื่อ function/class/export ต่อโฟลเดอร์ ~2,000 ตัวอักษร สร้างจาก `git ls-files` ในเครื่อง ไม่มี network, timeout 1s, ปิดด้วย `PONYTAIL_MAP=0`) · มี adapter แยกสำหรับ Copilot · Cursor · Qoder (ยังไม่ได้อ่าน)
- คำแนะนำ: **Pilot ก่อน** — ซ้อนกับ karpathy สูง (เลือกหนึ่งตัว) · ส่วนที่ต่างและน่าสนใจคือ `ponytail-review` / `ponytail-audit` ซึ่งหยิบใช้แยกเดี่ยวได้ · ข้อควรระวัง: mode เปิดทั้ง session, ฉีดรายชื่อ symbol ของ repo เข้า context ทุก session start และทิ้ง comment `shortcut:` ในโค้ด — ขัดกับทีมที่ห้ามหรือไม่ใช้ comment รูปแบบนี้

### 4.4 superpowers — `obra/superpowers` · Layer 1

- ~14 skills · เจ้าของ obra (Jesse Vincent)
- skill เด่น: `brainstorming` · `systematic-debugging` · `test-driven-development` · `writing-plans` · `executing-plans` · `subagent-driven-development` · `using-git-worktrees` · `requesting/receiving-code-review` · `verification-before-completion` · `using-superpowers` (meta-router)
- rigid — ทำตามเป๊ะ · ทับซ้อนกลางกับ Addy/ECC แต่เสริม Matt Pocock ได้ดี
- ติดตั้ง: marketplace `obra/superpowers-marketplace` → `plugin install superpowers` (Claude Code) หรือ `npx skills add` (ได้เนื้อ skill แต่ไม่ได้ hooks/meta-router)

### 4.5 pstack — `cursor/plugins` (`pstack/`) + `michael-denyer/pstack-claude` · Layer 1 (ทางเลือก)

- สไตล์การทำงานของ agent ตามแบบ poteto (Lauren Tan): ตอบกระชับ · prose ไม่ slop · ใช้ subagent อย่างตั้งใจ · verify งานก่อนส่ง
- ~50 dirs: `poteto-mode` (20KB + playbooks/references/scripts) · `how` `why` `interrogate` `architect` `arena` `swarm` `reflect` `tdd` `teach` `technical-writing` `unslop` `blast-radius` `figure-it-out` ฯลฯ + กลุ่ม `principle-*` (เช่น `principle-laziness-protocol`)
- `pstack-claude` = port สู่ Claude Code / Codex / Copilot / Pi / OpenCode / Gemini — **อยู่นอก Cursor ใช้ตัวนี้**
- ทับ superpowers สูง (tdd / planning / review) · ทับ maestro เฉพาะ `reflect`
- คำแนะนำ: หยิบราย skill (`how` · `why` · `interrogate` · `principle-laziness-protocol`) ไม่ติดตั้งทั้งชุดคู่ superpowers

### 4.6 mattpocock — `mattpocock/skills` · Layer 2

- ~35 skills "Skills for Real Engineers" · small + composable · catalog 6 หมวด:
  - **engineering:** `tdd` `implement` `diagnosing-bugs` `codebase-design` `domain-modeling` `improve-codebase-architecture` `prototype` `to-prd` `to-issues` `triage` `grill-with-docs` `resolving-merge-conflicts` `ask-matt` (router) `setup-matt-pocock-skills`
  - **productivity:** `grilling`/`grill-me` `handoff` `teach` `writing-great-skills`
  - **misc:** `git-guardrails-claude-code` `setup-pre-commit` `migrate-to-shoehorn` `scaffold-exercises`
  - **personal:** `edit-article` `obsidian-vault`
  - **in-progress:** `review` `decision-mapping` `loop-me` `writing-beats/fragments/shape`
  - **deprecated:** `design-an-interface` `qa` `request-refactor-plan` `ubiquitous-language`
- เหมาะกับ engineer ที่อยากคุม reasoning/process โดยเฉพาะ TS/JS · ทับต่ำกับ superpowers, กลางกับ ECC

### 4.7 addyosmani — `addyosmani/agent-skills` · Layer 2

- 24 flat skills "Production-grade engineering skills":
  - **กระบวนการ:** `spec-driven-development` `planning-and-task-breakdown` `incremental-implementation` `test-driven-development` `source-driven-development` `doubt-driven-development`
  - **คุณภาพ:** `code-review-and-quality` `code-simplification` `debugging-and-error-recovery` `security-and-hardening`
  - **Frontend/Perf:** `frontend-ui-engineering` `performance-optimization` `browser-testing-with-devtools`
  - **Ops:** `ci-cd-and-automation` `shipping-and-launch` `observability-and-instrumentation` `deprecation-and-migration`
  - **ออกแบบ/เอกสาร:** `api-and-interface-design` `documentation-and-adrs`
  - **บริบท:** `context-engineering` `interview-me` `idea-refine` `using-agent-skills` (meta)
- เด่น: `doubt-driven-development` (adversarial review) · `source-driven-development` (อ้าง docs ทางการ)
- **ทับ ECC สูงมาก — เลือกตัวเดียว**

### 4.8 ECC — `affaan-m/ECC` · Layer 2

- หลายร้อย skills + agents + commands ใน namespace `ecc:*` · เจ้าของ affaan-m
- ครอบคลุม full SDLC + **domain packs** (healthcare, network, finance, crypto/DeFi, logistics, trade) + **ภาษา/เฟรมเวิร์ก** (python, go, rust, kotlin, swift, php, java, react, vue, django, laravel, springboot ...) + **orchestration**
- เด่น: ของเฉพาะทางที่ไม่มีในชุดอื่น เช่น `ecc:healthcare-phi-compliance` `ecc:network-bgp-diagnostics` `ecc:security-bounty-hunter`
- แตะแกน B แบบกระจัดกระจาย (`agentic-engineering` `context-budget` `mcp-server-patterns` `eval-harness` `prompt-optimizer` `agent-harness-construction` `cost-aware-llm-pipeline` `agent-introspection-debugging`) — ไม่มี memory/audit/cost layer แบบ maestro
- คำแนะนำ: อย่าติดตั้งทุก skill; ใช้ selective profile เฉพาะ namespace/domain ที่ต้องการ · capability ต่อแพลตฟอร์มดู §12.1.1

### 4.9 orchestkit — `yonatangross/orchestkit` · Layer 2 (ทางเลือก)

- README ระบุ **106 skills · 171 hooks** · โครงสร้าง `plugins/ork-*/skills/ork-*` ราย harness (นับไฟล์ได้ 236 / 119 dirs เพราะมี mirror — ใช้เลข README เป็นค่าอ้างอิง)
- repo ใหญ่มาก (9,006 ไฟล์ — `docs/` 2,530 · `src/` 2,504 · `plugins/` 1,872 · `.html` 1,067)
- **สคริปต์ติดตั้ง (อ่านเนื้อหาแล้ว 2026-10-16):**
  - `bin/install-git-hooks.sh` / `bin/install-hooks.sh` = **เครื่องมือของ contributor ที่พัฒนา orchestkit เอง** (symlink pre-commit/pre-push เข้า `.git/hooks` ของ clone นั้น พร้อมสำรองไฟล์เดิมเป็น `.backup`) — **ไม่ใช่ขั้นตอนติดตั้งของผู้ใช้** (ฉบับก่อนหน้าของเอกสารนี้สรุปจากชื่อไฟล์ว่า "แตะ git hooks ของ repo" ซึ่งทำให้เข้าใจผิด)
  - `plugins/ork-codex/scripts/install-codex-profile.sh` คัดลอก `ork-mech.config.toml` ไปที่ `$CODEX_HOME` (สร้างไฟล์ใหม่เท่านั้น ปฏิเสธการเขียนทับ ไม่แก้ `config.toml`) · `install-codex-roles.sh` คัดลอก role `.toml` 4 ตัวไปโฟลเดอร์ปลายทางที่ระบุ ปฏิเสธการเขียนทับ
  - **profile `ork-mech` ตั้ง `approval_policy = "never"` + `sandbox_mode = "workspace-write"` + `network_access = true`** — มีผลเฉพาะเมื่อสั่ง `--profile ork-mech` (เจ้าของระบุว่าตั้งใจไม่ใช้ `--dangerously-bypass-approvals-and-sandbox`) · เปิดเมื่อเข้าใจว่า agent จะรันคำสั่งในโฟลเดอร์งานและออกเน็ตได้โดยไม่ถามอนุมัติ
  - hooks ฝั่ง Claude (`src/hooks/src/setup/*.ts`): ตรวจ environment (python3 · node · git · docker · sqlite3 · jq) · สร้างโฟลเดอร์และย้าย config เก่าเป็น backup · หมุน log (rename + gzip) · **ลบแถวใน sqlite `file_locks` ที่เก่ากว่า 24 ชม.** · **spawn กระบวนการ background แบบ detached** (maintenance/repair) · ไม่พบ network call ในไฟล์ที่สแกน · path ที่เขียนจริงยังไม่ได้ตรวจ
- ขอบเขตใกล้ ECC (full SDLC + hooks หนัก) · community เล็ก · push ล่าสุดตาม §3.0 (ตรวจจุดเดียว — ยังไม่รู้ cadence ระยะยาว)
- คำแนะนำ: **Choose one กับ ECC** — ห้ามซ้อน · ถ้าจะ pilot ให้ตรวจ hooks ทั้ง 171 ตัวว่าแก้ไฟล์/config อะไรบ้าง

### 4.10 maestro — `sharpdeveye/maestro` · Layer 3

- v2.0.0 · 37 unit tests · npm + VS Code Marketplace
- **1 core skill `agent-workflow`** (auto-load, `user-invocable: false`) + **7 domain references:** `prompt-engineering` · `context-management` · `tool-orchestration` · `agent-architecture` · `feedback-loops` · `knowledge-systems` · `guardrails-safety`
- **24 command-skills:**
  - **Analysis:** `/diagnose` (audit 5 มิติ ให้คะแนน 1-5) · `/evaluate` · `/reflect` (scorecard จาก audit log)
  - **Fix & Improve:** `/refine` `/streamline` `/calibrate` `/fortify` `/zero-defect`
  - **Enhancement:** `/amplify` `/compose` `/enrich` `/accelerate` `/chain` `/guard` `/iterate` `/temper` `/turbocharge`
  - **Utility:** `/extract-pattern` `/adapt-workflow` `/onboard-agent` `/specialize` `/teach-maestro` `/capture` `/recap`
- **moat:** persistent memory `.maestro/` (`context.md` · `decisions.jsonl` · `audit.jsonl` · `sessions/`) · cost estimation ต่อ command (Claude/GPT-4/Gemini/o3, ±20%) · "Workflow Slop Test" (symptom → command) · delivery 3 แบบ (skills · MCP server `maestro-workflow-mcp` 10 tools/25 prompts/8 resources · VS Code ext) · 10 providers (Cursor · Claude Code · Gemini · Codex · Copilot/Antigravity · Kiro · Trae · Trae-CN · OpenCode · Pi)
- **ปรัชญา:** structure over improvisation · constraints are features · measure don't assume · appropriate complexity · graceful degradation
- ใช้งาน: ทุก command แนะนำ next step เสมอ (ไม่มีทางตัน) · เรียกต่อกันได้ เช่น `/diagnose /calibrate /refine`
- จุดอ่อน: ไม่แตะ SDLC/โค้ดแอป · ต้อง `/teach-maestro` ก่อน (เก็บ context ลง `.maestro.md`) · **เงียบตั้งแต่ 2026-04-29** (§3.0)

### 4.11 taste-skill — `Leonxlnx/taste-skill` · Vertical (frontend design)

- 13 skills · sponsor: Vercel OSS Program + Emil Kowalski · เว็บ tasteskill.dev
- ขอบเขตที่ประกาศเอง: "Landing pages, portfolios, and redesigns. **Not** dashboards, not data tables, not multi-step product UI"
- โครงสร้าง (⚠️ **ชื่อ skill ใน frontmatter ≠ ชื่อโฟลเดอร์**):
  - **ตัวหลัก:** `design-taste-frontend` (โฟลเดอร์ `taste-skill`, ~87KB) — "Design Read" 1 บรรทัดก่อนเขียนโค้ด → **3 Dials** (`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`) + preset ต่อ use-case + Anti-Default Discipline (แบน AI-purple gradient · hero กลางจอบน dark mesh · การ์ด 3 ใบเท่ากัน · Inter + slate-900)
  - `design-taste-frontend-v1` (~21KB) — รุ่นเก่า **อย่าติดตั้งคู่ตัวหลัก**
  - **Style variants (8–16KB):** `industrial-brutalist-ui` · `minimalist-ui` · `high-end-visual-design` · `stitch-design-taste` · `redesign-existing-projects` · `brandkit`
  - **Image pipeline (36–40KB):** `imagegen-frontend-web` · `imagegen-frontend-mobile` · `image-to-code`
  - **อื่น:** `full-output-enforcement` · `gpt-taste` · โบนัส `research/laziness/`
- ผ่าน vet 2026-07-12: design guidance ล้วน ไม่มี shell/network/credential
- คำแนะนำ: โหลดเฉพาะตัวหลักหรือ variant ที่ใช้จริง — **อย่าเปิดทั้ง 13 ตัว**

### 4.12 aidlc-workflows — `awslabs/aidlc-workflows` · Layer 1–2 (Pilot — แทน ไม่ซ้อน)

- **AI-DLC (AI-Driven Development Life Cycle)** ของ AWS Labs · v2.11.0 (ตรวจ 10-16 · tag ล่าสุด 10-28 เป็น prerelease v2.11.2-preview — stable ล่าสุดยังไม่ได้ตรวจ) · MIT-0 · "one core, many harnesses": Claude Code · Kiro CLI/IDE · Codex CLI · Cursor · opencode · GitHub Copilot · repo 1,857 ไฟล์ (1,233 เป็น `tests/`) · `SKILL.md` 14 ไฟล์ (สำเนาราย harness)
- **ตัวตน:** workflow engine ครบวงจร ไม่ใช่ชุดเคล็ดลับ — 33 stage ใน 5 phase (Initialization · Ideation · Inception · Construction · Operation) + **11 scope** (`enterprise` `feature` `mvp` `poc` `bugfix` `refactor` `infra` `security-patch` `classic` `workshop` `express`) · `/aidlc` เป็น "conductor" ที่วนถาม engine ว่าทำอะไรต่อ (`aidlc engine orchestrate next`) และมี approval gate ทุก stage · skill อื่น: `aidlc-knowledge` `aidlc-outcomes-pack` `aidlc-replay` `aidlc-session-cost` (read-only)
- **หนักมาก:** `SKILL.md` ของ `/aidlc` เพียงตัวเดียว ~49 KB (หนักรองจาก taste-skill ตัวหลัก ~87 KB ที่หนักสุดในเอกสาร)
- **ติดตั้ง (อ่านเอกสาร + `docs/guide/18-install-and-lifecycle.md` 2026-10-16):** `curl -fsSL …/releases/latest/download/install.sh | sh` (Windows: `irm … | iex`) ติดตั้ง **native binary `aidlc`** + runtime ของทุก harness · **บังคับตรวจ SHA-256** (ต้องมี `sha256sum`/`shasum`) · ตรวจ attestation ผ่าน GitHub CLI **เฉพาะเมื่อมี `gh`** (ไม่มีก็ข้าม — ผ่านด้วย checksum อย่างเดียว) · **pin ได้ด้วย `--version x.y.z`** · Windows แก้ User PATH · เส้นทาง manual-copy ต้องใช้ Bun
- **สิ่งที่ `aidlc config --harness claude` เขียนลงโปรเจกต์ (อ่าน template `harness/claude/settings.json` + `.mcp.json`):**
  - `permissions.allow`: **`Edit(/**)`** = แก้ไฟล์ทุกไฟล์ในโปรเจกต์โดยไม่ถาม (ยืนยันจาก [เอกสาร permissions ของ Claude Code](https://code.claude.com/docs/en/permissions) 2026-10-16: `/path` ใน project settings `.claude/settings.json` หมายถึง `<primary working directory>/path`) · `Bash(bun .claude/tools/aidlc.ts engine *)` · `Task` · `WebSearch`
  - **hooks ผูกกับเกือบทุกเหตุการณ์:** `PreToolUse` ทุก tool (`fold-usage`) + `guard-tool-call` บน Read/Edit/Write/Bash/Task/Agent ฯลฯ · `UserPromptSubmit` → `record-human-turn` (**บันทึกคำที่ผู้ใช้พิมพ์**) · SessionStart/SessionEnd · PostToolUse บน Write/Edit · timeout สูงสุด **1,800 วินาที** ต่อ hook · template เรียกผ่าน `bun` ขณะที่ README ว่า native install เรียกผ่าน `aidlc` (ยังไม่ได้เทียบว่าไฟล์ที่ติดตั้งจริงต่างกันอย่างไร)
  - **`.mcp.json` เพิ่ม MCP 5 ตัว แบบ `uvx …@latest` (ไม่ pin):** `context7` (HTTP + `CONTEXT7_API_KEY` จาก env) · `aws-mcp` (`mcp-proxy-for-aws` → `aws-mcp.us-east-1.api.aws`) · `aws-pricing` · `aws-iac` · `aws-serverless` — รันแพ็กเกจ PyPI เวอร์ชันล่าสุดทุกครั้ง
  - `companyAnnouncements` ใส่แบนเนอร์ยาว (ตาราง stage/scope) ทุก session
- **ทับซ้อน:** สูงมากกับ process (superpowers · pstack) และ SDLC (mattpocock · addyosmani · ECC · orchestkit) — ใช้ **แทน** ไม่ใช่ซ้อน · เหมาะกับ org ที่ใช้ AWS/Kiro และอยากได้ workflow มี gate/ตรวจสอบย้อนหลัง
- **คำแนะนำ:** **Pilot ในโปรเจกต์แยกเท่านั้น** · pin `--version` · อ่าน `settings.json` และ `.mcp.json` ที่ถูกเขียนลงโปรเจกต์ก่อนใช้ · ถ้าไม่ต้องการ MCP ของ AWS/context7 ให้ลบออกจาก `.mcp.json` หลังติดตั้ง · อย่าเปิดคู่กับ superpowers/pstack/ECC

---

## 5. Domain Verticals

### 5.1 founder-skills — Business/Founder

- <https://github.com/ognjengt/founder-skills> · **Add selective** · โครงสร้าง `skills/*/SKILL.md` + references
- ขอบเขต: strategic planning · GTM · pricing · competitor intelligence · CRO · outreach · PRD · SOP · brand/content writing
- เลือก 3-6 skills ตามงาน · ตรวจ claims/ข้อมูลตลาดจากแหล่งปัจจุบัน · ปกป้อง `FOUNDER_CONTEXT.md`

### 5.2 Product UI — ui-skills หรือ ux-ui-agent-skills (เลือก 1)

| | ui-skills | ux-ui-agent-skills |
|---|---|---|
| Repository | <https://github.com/ibelick/ui-skills> | <https://github.com/plugin87/ux-ui-agent-skills> |
| ขอบเขต | baseline UI · a11y fixes · metadata · motion performance · UI improvement | design tokens · design QA/review (6 มิติ + Nielsen) · Figma integration · a11y audit · quality `gate` · governance (README อ้าง 52 components / WCAG) |
| รูปแบบ | collection + CLI (`npx ui-skills`) | v3.0.0 (README 10-28): 26 runnable skills · 16 framework adapters · ระบุ Claude Code · Codex · Cursor · Copilot · Gemini CLI · Antigravity · Aider · MCP · ช่องทางติดตั้ง Claude plugin / MCP server / Homebrew / `npx` · 52 gates (34 เปิด browser จริง) — กลไกราย harness ยังไม่ได้ตรวจ |
| เหมาะเมื่อ | audit/แก้ product UI ที่มีอยู่ | ทีมที่มี design system/Figma และต้องการ gate คุณภาพ |
| สถานะ | Add opt-in | Choose one กับ ui-skills |

- Routing: product UI → กลุ่มนี้ · marketing/landing → taste-skill หรือ Hallmark
- ตรวจว่า rules (`MUST`/`NEVER`, bias ต่อ Tailwind/React/motion) เข้ากับ stack ของโปรเจกต์

### 5.3 Anti-slop — anti-slop / no-ai-slop / unslop

- `anti-slop` (<https://github.com/miqdadbadjuber/anti-slop>): `antislop` `antislop-code` `antislop-ui` `antislop-layoutmobile` + **text:** `antislop-copywriting` `antislop-human`
- `no-ai-slop` (<https://github.com/petergyang/no-ai-slop>): text อย่างเดียว · 20+ patterns
- **กฎ:** surface UI/code ใช้ anti-slop ได้ · surface text เลือก **no-ai-slop หรือ text skills ของ anti-slop อย่างใดอย่างหนึ่ง** — ห้ามเปิด global ทั้งคู่
- `antislop-ui` ทับ taste-skill/Hallmark — ถ้ามี design direction หลักแล้วไม่ต้องเปิด

#### 5.3.1 unslop — `heydamir/unslop` 🆕 (Pilot · Choose one ฝั่ง UI)

- Repository: <https://github.com/heydamir/unslop> · Damir Sokolovsky (@heydamir) · **CC BY 4.0** (ใช้เชิงพาณิชย์ได้ ต้องให้เครดิต — ไม่ใช่ share-alike) · สร้าง 2026-10-29 · ไม่มี GitHub Release
- ตัวตน: skill เดียว (`skills/unslop/`) เปลี่ยน UI ที่ "vibecoded" ให้ดูออกแบบจริง — audit ตาม `references/signs.md` → เสนอ direction 5 บรรทัดแล้ว **หยุดรอผู้ใช้ตอบ** → แก้ทีละ pass: spacing · color · icons · copy · type · layout · details · visuals · motion · ค่าอยู่ใน `references/tokens.md`
- ปลายทาง: React · Tailwind · HTML/CSS (README เพิ่ม Next.js · Vue · Svelte) · มีแค่ลิงก์เว็บ → `scripts/snapshot.mjs` เซฟหน้าเป็น HTML · มีแค่ screenshot → สร้าง HTML ใหม่ก่อน
- ติดตั้ง: Claude Code `~/.claude/skills/unslop` (`/unslop`) · Codex `~/.agents/skills/unslop` หรือ `$skill-installer` (`$unslop`) · มี `agents/openai.yaml`
- optional: วิดีโอ story ≤10 วินาที (`scripts/story.mjs` — ต้องมี Playwright + ffmpeg) · สร้างภาพ hero ผ่าน image MCP (fal · Replicate · OpenAI images · Higgsfield) — **เสียเงิน** · skill สั่งให้แสดง prompt/model/ขนาด และถามก่อนทุกครั้ง
- ผล audit (11-04): ไม่มี telemetry · ไม่มี API key · ไม่มีคำสั่งติดตั้งที่รันเอง · scripts ใช้ network เฉพาะเว็บที่ผู้ใช้ให้ (snapshot) และ server `127.0.0.1` ชั่วคราว (story) · เรียก `ffmpeg` ผ่าน `execFileSync` ไม่ผ่าน shell — รายละเอียด `skill-collections-repo-analysis-20261104.md` §3
- ข้อควรระวัง: `SKILL.md` 31 KB (เปลือง context) · `references/refs/` เป็นรูป webp ~1.3 MB ติดไปกับโฟลเดอร์ skill · **ชื่อชนกับ `unslop` ของ pstack** (คนละงาน — ตัวนั้นตัดสำนวน AI ในงานเขียน) · วิดีโอทุกตัวฝังเครดิต `unslop by @heydamir` ตาม license · ดาวโตเร็วผิดปกติ ไม่ใช่ตัวชี้วัดคุณภาพ
- **กฎ:** ฝั่ง UI เลือก **unslop หรือ `antislop-ui`** อย่างใดอย่างหนึ่ง · มี taste-skill/Hallmark เป็น design direction หลักแล้วไม่ต้องเปิด · ใช้กับ product UI ที่มี design system แล้วให้ตรวจว่า token ของ unslop ไม่ทับ token ของโปรเจกต์
- สถานะ: **Pilot** — ทดลองกับหน้าเดียวในโปรเจกต์แยกก่อน · ปิด image MCP ไว้จนกว่าจะตั้งงบ

### 5.4 AntV Infographic — Data Storytelling

- <https://github.com/antvis/Infographic> · **Add selective**
- rendering framework + skill pack ~5 ตัว: creation · syntax/structure · item generation · template authoring
- runtime use = creator + syntax skills · template updater เฉพาะผู้ดูแล renderer
- ต้อง render และตรวจ visual, SVG, responsive, accessibility จริง

### 5.5 Diagram — archify / fireworks-tech-graph / diagram-design (เลือก 1)

ผล benchmark รันจริง 2026-10-15 (รายละเอียดเต็มใน `skill-collections-repo-analysis-20261015.md` §5):

| | archify | fireworks-tech-graph | diagram-design |
|---|---|---|---|
| Repository | <https://github.com/tt-a1i/archify> | <https://github.com/yizhiyanhua-ai/fireworks-tech-graph> | <https://github.com/cathrynlavery/diagram-design> |
| กลไก | CLI 4 gates (`validate` / `deliver` / `check` / `browser-check`) | CLI `validate` → `render` → `check` → `export-html` | ไม่มี renderer — วาดตาม SKILL แล้วรัน `self_check.py` |
| Brief เดียวกัน (6 nodes / 5 edges) | ✅ ผ่าน ~15s | ❌ ติด composition gate — ผ่านเมื่อลดเหลือ 3 nodes | — |
| Output | explorable HTML ~813KB (ฝัง viewer) + export SVG/WebM | SVG ~27KB / HTML ~36KB / PNG / GIF | HTML/SVG/PNG ~12KB · import drawio/Mermaid/excalidraw |
| Coverage | architecture | technical graph | 44–45 types (Wardley / Sankey / journey ฯลฯ) |
| จุดเด่น | pipeline ครบที่สุด | fail ดีกว่าวาดผิด | ชนิด diagram กว้างที่สุด |
| จุดอ่อน | output ใหญ่ | authoring ยาก — ลอก geometry จาก fixture | คุณภาพขึ้นกับคนวาด |

- **ใช้เมื่อ:** architecture จาก codebase → archify · SVG เนี้ยบมี gate → fireworks · diagram ชนิดพิเศษ → diagram-design
- **archify เปลี่ยน license เป็น Apache-2.0** — commit 2026-10-25 11:40 (เวลาไทย) `license: adopt Apache-2.0 while preserving historical MIT grants` · ไฟล์ LICENSE ปัจจุบันเป็น Apache-2.0 · เวอร์ชันก่อนหน้านั้นยังได้สิทธิ์ MIT ตามเดิม (ตามข้อความ commit) · ถ้า pin เวอร์ชันใหม่ให้ปรับ NOTICE/attribution ตาม Apache-2.0
- **ขนาด repo:** archify 1,017 ไฟล์ และมี **`archify.zip` 5 MB commit อยู่ใน repo** (ตรวจเนื้อ zip ไม่ได้ — ติดตั้งจาก source อย่าใช้ zip; ยังไม่ได้เปิดดูเนื้อ) · diagram-design 681 ไฟล์ แต่เป็น skill เดี่ยว + ตัวอย่าง/asset (`.html` 218 · `.png` 92 · `.svg` 88) หยิบเฉพาะ `SKILL.md` + references ได้

### 5.6 Security — security-audit-skill · trailofbits · reverse-skill · rea

| | security-audit-skill | reverse-skill | rea |
|---|---|---|---|
| Repository | <https://github.com/cloudflare/security-audit-skill> | <https://github.com/zhaoxuya520/reverse-skill> | <https://github.com/morluto/rea> |
| ขอบเขต | audit codebase / API / CLI / daemon · findings แบบ machine-readable | reverse engineering · pentest · CTF · security research | reverse-engineer-anything (native / managed / Electron / firmware) |
| รูปแบบ | single skill (official Cloudflare) | router pack + modules + scripts + tool bootstrap | 1 skill + dev skills ของ repo 3 ตัว |
| สถานะ | **Add selective** — ใช้ก่อนสำหรับงาน defensive | **Restricted** | **Restricted** — choose one กับ reverse-skill |

- `security-audit-skill` รัน full workflow เฉพาะเมื่อสั่ง audit ชัดเจน — ไม่ auto-trigger
- **`rea` ไม่ใช่ pack ของ markdown:** repo 4,057 ไฟล์ เป็นแอป TypeScript (`src/` 1,978 · `tests/` 1,240 · `scripts/` 399 · `.ts` ~3,000 ไฟล์) พร้อม `install.sh` และ `bridge/` — พื้นผิวที่ต้อง review ใหญ่กว่าที่ "4 `SKILL.md`" บอกมาก · `reverse-skill` มี 89 ไฟล์ `SKILL.md` ใน 599 ไฟล์
- **ข้อบังคับก่อนใช้ reverse-skill หรือ rea:**
  1. ระบุ owner, target และ authorization scope
  2. allowlist เฉพาะโมดูลที่ต้องการ
  3. pin commit และ dependency
  4. review scripts / network / tool installation
  5. ใช้ sandbox และ audit log
  6. ห้าม global auto-trigger
- ไม่รับ: modules ที่เน้น bypass, malware, credential abuse หรือ uncontrolled exploitation

#### 5.6.1 Candidates รอบ 2026-10-28 — security audit/research

อ่าน README + รายการไฟล์ทั้ง repo + frontmatter ตัวอย่าง 1 ไฟล์ต่อ repo (ยังไม่ได้รัน ยังไม่ได้อ่าน scripts/hooks) — หลักฐานใน `skill-collections-repo-analysis-20261028.md` §3.1

| Repository | skill จริง | รูปแบบ / harness ตาม README | จุดเด่น | ข้อควรระวัง | สถานะ |
|---|---|---|---|---|---|
| [trailofbits/skills](https://github.com/trailofbits/skills) | 95 (97 ไฟล์ − fixture 2) ใน 44 plugins | marketplace Claude Code · Codex | ครบที่สุด: `differential-review` `static-analysis` `semgrep-rule-creator` `variant-analysis` `supply-chain-risk-auditor` `constant-time-analysis` `zeroize-audit` `building-secure-contracts` `testing-handbook-skills` ฯลฯ · frontmatter ดี | **CC-BY-SA-4.0 (share-alike)** — แจกต่อ/ดัดแปลงต้องใช้ license เดียวกัน · มี plugin นอก security (`modern-python` `gh-cli` `devcontainer-setup` `culture-index` `let-fate-decide`) ที่ชนกับ SDLC collection | **Add selective** ราย plugin |
| [codexstar69/bug-hunter](https://github.com/codexstar69/bug-hunter) | 11 (root 1 + `skills/` 10) | Claude Code · Codex · Cursor · Copilot · Kiro · Windsurf · OpenCode · Factory Droid (install `--agent`) | Hunter → Skeptic → Referee · รันแรกแบบ scan-only single-pass · Fixer มี scope ชัด · npm `@codexstar/bug-hunter` | README อ้าง source v3.2.0 แต่ release ล่าสุด v3.1.0 · community เล็ก | Choose one กับ security-audit-skill — **Pilot** |
| [AgriciDaniel/pya](https://github.com/AgriciDaniel/pya) | 1 + 9 agents | Claude Code plugin | 9 read-only agents + verifier · ครอบ AI agent / MCP / prompt injection ด้วย · README: ไม่รันโค้ด ไม่ติดตั้งอะไร อยู่ offline | threat feed มีวันที่ (README: 2026-10 ณ 10-23) — ต้องอัปเดตตาม · community เล็ก | Choose one — **Pilot** |
| [tanviet12/vbsec](https://github.com/tanviet12/vbsec) | 1 (mirror 3: root · codex · antigravity) | Claude Code · Codex · Antigravity | 21 ชนิดช่องโหว่ · trace input ถึง call อันตราย · รายงาน vi/en | `--auto-fix` (agentic patch + verify loop) และ `--sca` (lookup CVE สดผ่าน OSV.dev = ออก network) เป็น optional ตาม frontmatter · SKILL.md ~27 KB | Choose one — **Pilot** |
| [ghostsecurity/skills](https://github.com/ghostsecurity/skills) | 8 (`ghost` 7 + `exo` 1) | Claude Code marketplace เท่านั้น | แยกงาน `scan-code` `scan-deps` `scan-secrets` `validate` `proxy` `report` | skill เรียก binary ของ Ghost (Poltergeist secrets · Wraith deps — query OSV ผ่าน network · Reaper = MITM HTTPS proxy · Exorcist) · ยังไม่ได้ตรวจ binary | **Pilot** |
| [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp) | 1 (`owasp-security`) | Claude Code plugin (`/plugin marketplace add agamm/claude-code-owasp`) | OWASP Top 10:2025 · ASVS 5.0 · LLM/Agentic Top 10 (2026) | description ให้ trigger ตอนเขียน/รีวิวโค้ดทั่วไป → ชน Addy `security-and-hardening` / ECC `security-review` | **Add opt-in** (knowledge layer ไม่ใช่ workflow) |
| [anthropics/defending-code-reference-harness](https://github.com/anthropics/defending-code-reference-harness) | 9 (`.claude/skills`: `threat-model` `vuln-scan` `triage` `patch` `verify` `dnr-hunt` `dnr-respond` `customize` `quickstart`) | Claude Code | reference ของ Anthropic เรื่อง defensive vuln discovery → patch → verify | **README: "not maintained and is not accepting contributions"** · license: API ตอบ NOASSERTION แต่ไฟล์ LICENSE เป็น Apache-2.0 | **Reference** — อ่านเป็นแบบอย่าง ไม่ติดตั้ง |

- **ข้อสรุป:** workflow audit เลือกตัวเดียว (`security-audit-skill` ยังเป็น default เพราะ official + ไม่ auto-trigger) · ถ้าต้องการเปรียบเทียบให้ benchmark ด้วย repo เดียวกัน: findings จริง/false positive · เวลา · token · ไฟล์ที่แตะ · network ที่ออก
- `trailofbits` เสริมได้ทั้งคู่เพราะเป็น **เครื่องมือเฉพาะจุด** (semgrep rule, constant-time, supply chain) ไม่ใช่ workflow audit ทั้งระบบ — แต่ `differential-review` ทับ review ของ superpowers/addy บางส่วน
- ข้อบังคับ 6 ข้อด้านบนใช้กับ `vbsec --auto-fix` และ `bug-hunter` Fixer ด้วย (แก้โค้ดได้)

### 5.7 Compliance — Privacy-Data-Protection-Skills

- <https://github.com/mukul975/Privacy-Data-Protection-Skills> · **Add selective ราย jurisdiction**
- `plugins/ai-privacy-governance-skills/skills/*` 824 ไฟล์ · GDPR · CCPA · EU AI Act · HIPAA · LGPD · PIPL · DPDP · มี `ai-dpia` ตาม EDPB 04/2025
- ใหญ่ที่สุดในเอกสาร — หยิบเฉพาะ jurisdiction ที่ใช้ · เงียบตั้งแต่ 2026-03-16 → ตรวจว่ากฎหมายไม่เปลี่ยนหลังจากนั้น
- ผลลัพธ์เป็นร่างให้ฝ่ายกฎหมายตรวจ ไม่ใช่คำปรึกษากฎหมาย

### 5.8 Media — ffmpeg-skill

- <https://github.com/kajisho5/ffmpeg-skill> · **Add selective**
- **ใช้ root `SKILL.md`** (`name: ffmpeg-skill`): 42 scripts + MCP (12 core / 42 เต็ม) · Python 3.9 stdlib · ไม่ใช้ cloud/keys
- `.claude/skills/` 13 ตัวเป็น dev-workflow ของ repo (`code-review` `release-management` ฯลฯ) — **ไม่ต้องติดตั้ง**
- **สร้างวิดีโอจาก HTML** (launch film, explainer, slideshow, caption) ใช้ **HyperFrames** (§6) — คนละงานกับ ffmpeg-skill ที่ประมวลผลไฟล์ media ที่มีอยู่

### 5.9 Methodology reference — Atlas · claude-code-best-practice

- **Atlas** (<https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas>) · Reference + selective
  - 20 skills (`adversarial-review` `abstraction-power` `learning-from-mistakes` `super-product-owner` `postgresql-*` ฯลฯ) · ปรัชญา KISS/YAGNI/DRY · wireframe → HTML spec → native plan loop
  - ⚠️ **ไม่มี license** — ใช้เชิงพาณิชย์ต้องขอเจ้าของก่อน
  - ⚠️ `pdf` `skill-creator` `mcp-builder` `theme-factory` `algorithmic-art` `frontend-design` ชื่อตรงกับ skill ของ `anthropics/skills` — ถ้าเป็นสำเนาจะติด license ต้นฉบับซ้อน และซ้ำกับ skill ที่ harness หลายตัวมีอยู่แล้ว
  - หยิบได้: `adversarial-review` (hostile second opinion ที่รัน target จริง)
- **claude-code-best-practice** (<https://github.com/shanraisshan/claude-code-best-practice>) · Reference — ตัวอย่างการจัด `.claude/` (skills `agent-browser` `presentation/*` `time-skill` `weather-*`) อ่านเป็นแนวทาง ไม่ติดตั้ง

### 5.10 Social media research — social-media-research-skills

- <https://github.com/ScrapeCreators/social-media-research-skills> · **Add opt-in** · MIT · 13 skills ใน `skills/` (`outlier-post-finder` `competitor-social-research` `ad-library-teardown` `comment-mining` `audience-research` `influencer-prospecting` `trend-discovery` `transcript-intelligence` ฯลฯ)
- README ระบุ Claude Code · Cursor · Codex · Copilot · Gemini CLI · Windsurf · VS Code (Agent Skills spec)
- **ต้องมี `SCRAPECREATORS_API_KEY` (บริการเสียเงินของผู้ทำ repo)** — skill ดึงข้อมูลผ่าน API ของ vendor (มี skill `scrapecreators-api` เป็นตัวกลาง) · ค่าใช้จ่ายต่อ request และข้อมูลที่ส่งออกยังไม่ได้ตรวจ · repo เงียบตั้งแต่ 08-27
- เสริม founder-skills ด้าน GTM/competitor ได้ (ต่ำ) · ตรวจ ToS ของแพลตฟอร์มต้นทางและนโยบายข้อมูลส่วนบุคคลก่อนเก็บข้อมูล creator/ผู้คอมเมนต์

---

## 6. Hybrid และ Product-Specific Packs

| Package | รูปแบบ | ใช้เมื่อ | สถานะ |
|---|---|---|---|
| [Ruflo](https://github.com/ruvnet/ruflo) | meta-harness + MCP + plugins + skill catalog | ต้องการ swarm/orchestration platform | Pilot — ห้ามเป็น baseline · choose one กับ maestro |
| [claude-code-guide](https://github.com/zebbern/claude-code-guide) | skill/agent catalog ขนาดใหญ่ | หา specialist skills | Reference — allowlist รายตัว |
| [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | plugin + skills + agents + knowledge graph | persistent codebase understanding | Choose one กับ Graphify/Graft |
| [rtk](https://github.com/rtk-ai/rtk) | CLI proxy ลด token + 12 skills (`rtk-tdd` `rtk-triage` `security-guardian` `ship` ฯลฯ) | ลด token ของ command output | Companion — ใช้คู่ headroom ได้ · skill ชุดนี้ไม่จำเป็นต้องเปิด |
| [witr](https://github.com/pranshuparmar/witr) | diagnostic CLI + 1 skill | ตรวจ process/port/container | Companion (ดู §11) |
| [WeKnora](https://github.com/Tencent/WeKnora) | RAG framework + CLI skills (`weknora-rag-search` `weknora-shared`) | ทีมที่ใช้ WeKnora เป็น RAG backend | Companion — **license other อ่านก่อนใช้** |
| [claude-ops](https://github.com/Lifecycle-Innovations-Limited/claude-ops) | 69 skills (`ops-*` AWS/deploy/monitoring/revenue + `boss` `flow` `ledger`) + daemon | ops automation | Pilot ใน environment แยก — มี daemon และ credentials |
| [OpenAI Codex Security](https://github.com/openai/codex-security) | security CLI/SDK + bundled skills | ใช้ official Codex Security runtime | Per-project — ติดตั้งผ่าน workflow ทางการ |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | durable workflow + versioned skills | โปรเจกต์ใช้ Trigger.dev | Per-project — ให้ตรง SDK version |
| [typesafe-ai/skills](https://github.com/typesafe-ai/skills) | product pack 1 skill | โปรเจกต์ใช้ผลิตภัณฑ์นั้น | Per-project |
| [Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | Unity plugin + MCP + 25 skills | งาน Unity | Per-project |
| [CLI-Anything](https://github.com/HKUDS/CLI-Anything) | framework + registry (CLI-Hub) ของ CLI harness ต่อซอฟต์แวร์จริง (Blender · QGIS · Audacity · Calibre · FreeCAD ฯลฯ) — แพ็กเกจ pip `cli-anything-*` + `SKILL.md` รายตัว (151 ไฟล์) | ให้ agent ใช้ซอฟต์แวร์ที่ไม่มี API ผ่าน CLI | Add selective ราย CLI — ดูหัวข้อด้านล่าง |
| [ReMe](https://github.com/agentscope-ai/ReMe) | local-first memory ของ agent (Markdown + wikilink) · pip `reme-ai` · plugin Claude Code/Codex (มี hooks + MCP) · 7 `SKILL.md` | memory ข้าม session แบบไฟล์ที่ผู้ใช้คุมเอง | Pilot — ดูหัวข้อด้านล่าง + §14.9 |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | framework HTML→MP4 (HeyGen) + 7 skills (`hyperframes` `hyperframes-cli` `hyperframes-registry` `figma` `media-use` `remotion-to-hyperframes` `slideshow`) | โปรเจกต์ที่สร้างวิดีโอด้วย HyperFrames | Per-project — ดูหัวข้อด้านล่าง |
| [oh-my-hermes](https://github.com/rlaope/oh-my-hermes) | operating layer ของ Hermes Agent · 156 skills ไม่ซ้ำ (`omh-*` `ulw-*` `dag-ulw` ฯลฯ — 277 ไฟล์เพราะ mirror) · ติดตั้งด้วย curl | ใช้ Hermes Agent เป็น harness หลัก | Per-project (Hermes เท่านั้น) — ทับ Layer 1–3 ทั้งหมด ห้ามซ้อน superpowers/ECC |
| [hermes-official-plugins](https://github.com/NousResearch/hermes-official-plugins) | plugins ทางการของ Hermes: blender · meshy · rea (`reverse-engineer-anything` `crash-triage`) · snyk · touchdesigner · elevenlabs · openclaw-migration (8 skills) | ใช้ Hermes Agent | Per-project · **plugin `rea` สืบสถานะ Restricted จาก §5.6** |
| [Traceway](https://github.com/tracewayapp/traceway) | observability platform (OTel) + 4 skills (`traceway` `traceway-setup` `traceway-learn` `traceway-write`) + dev 1 | ทีมที่ใช้ Traceway | Per-project — skill ใช้ CLI ของ Traceway login/query production |
| [harness-engineering](https://github.com/jrenaldi79/harness-engineering) | reference guide เรื่อง CLAUDE.md enforcement + Claude Code plugin (`setup` `readiness` `documentation`) | bootstrap โปรเจกต์ให้มี git hooks/linter/secret scan | Reference — `/setup` เขียน hooks + scripts ลงโปรเจกต์ (README: ไม่ stage ไฟล์เอง) · ทับ claude-code-best-practice |

- **Ruflo:** technically เป็น collection แต่ operationally เป็น platform choice · risk: tool discovery overload, hook/config mutation
- **claude-code-guide:** คุณภาพและ provenance ต่างกันราย skill · มี security content แบบ dual-use — **never import all**
- **Understand-Anything:** สร้าง `.ua/` knowledge graph · มี hook และ multi-agent assumptions
- **claude-ops:** จำกัด scope credential และอย่ารัน daemon บนเครื่องที่มี production access จนกว่าจะ audit
- **CLI-Anything** (Apache-2.0 · 1,872 ไฟล์ / 151 `SKILL.md` — อ่าน README + sample `blender/…/SKILL.md` 2026-10-16):
  - แนวคิด: สร้าง/เก็บ "harness" เป็น CLI แบบ stateful (JSON output สำหรับ agent + REPL) ต่อซอฟต์แวร์จริง · ติดตั้งได้สองทาง: **CLI-Hub** (`pip install cli-anything-hub` → `cli-hub install <name>` ติดตั้งแพ็กเกจจาก **pip / npm / brew** รวมถึง "Public CLIs" ของบุคคลที่สาม) หรือเฉพาะ skill ผ่าน `npx skills add HKUDS/CLI-Anything --skill <name> -g -y`
  - **ข้อควรระวัง:** `-g -y` ติดตั้ง global โดยไม่ถาม · harness ส่วนใหญ่ **รับ PR จากชุมชน** (README บันทึกการแก้ path traversal/symlink และ XML parsing ย้อนหลัง จึงมีคุณภาพ/ความปลอดภัยต่างกันรายตัว) · แต่ละ CLI ต้องมีซอฟต์แวร์ต้นทางในเครื่อง (เช่น Blender ≥ 4.2) · ตัวเลข "2,461 tests passing" เป็นของ upstream ไม่ได้ตรวจ · `SKILL.md` รายตัวเป็นเอกสารคำสั่ง frontmatter สั้น (name + description ทั่วไป)
  - **คำแนะนำ:** เลือกติดตั้งราย CLI ที่ใช้จริงเท่านั้น (ไม่ใช่ทั้ง registry) · ครั้งแรกไม่ใส่ `-g -y` · ติดตั้ง pip ใน venv แยก · ทับกับ `ffmpeg-skill` / เครื่องมือ diagram / Unity-MCP เฉพาะงานซอฟต์แวร์เดียวกัน
- **ReMe** (Apache-2.0 · 888 ไฟล์ / 7 `SKILL.md` — อ่าน README + `skills/reme_memory/SKILL.md` + รายการไฟล์ integration 2026-10-16):
  - แนวคิด: memory เป็นไฟล์ Markdown (frontmatter + wikilink) ใน workspace ที่ผู้ใช้คุมเอง ค้นด้วย BM25 + embeddings (ไม่บังคับ) + wikilink · integration: Claude Code · Codex · Hermes · OpenClaw · QwenPaw · DeepSeek Harness · เข้าถึงได้ทาง CLI/HTTP/MCP/Python
  - **plugin ฝั่ง Claude Code/Codex มี hooks (`hooks.json` + `auto_memory.py`) และ MCP bridge** — hook จับบทสนทนาเข้า memory อัตโนมัติ (ยังไม่ได้อ่านโค้ด `auto_memory.py`)
  - **ข้อมูลออกนอกเครื่อง:** งานที่ใช้ LLM (`auto_memory` `auto_resource` `auto_dream`) ต้องตั้ง `LLM_API_KEY` + `LLM_BASE_URL` และ **ส่งเนื้อหาไปยัง endpoint ที่ตั้ง** (ตัวอย่างใน `SKILL.md` ชี้ไป DashScope ของ Alibaba Cloud ค่าเริ่มต้นโมเดล `qwen3.7-plus`) · ส่วนที่ไม่ใช้โมเดล (ไฟล์ · BM25 · wikilink) ทำงานได้โดยไม่ต้องมี credential · `SKILL.md` ระบุให้ถามผู้ใช้ก่อนติดตั้ง pip และไม่ยัดตัวเองลง environment เงียบ ๆ (พฤติกรรมที่ดี) · persist source record โดยตัด tool result ที่ recall มาและ base64
  - **คำแนะนำ:** Pilot · เริ่มด้วยโหมดไม่ใช้ LLM · ชี้ `LLM_BASE_URL` ไปยัง endpoint ที่ยอมให้เห็นบทสนทนาเท่านั้น · memory ของ agent ต้องมี retention/ACL ตามข้อควรระวังใน §9 · เลือกหนึ่งตัวต่อโปรเจกต์ (§14.9)
- **HyperFrames** (Apache-2.0 · 9,389 ไฟล์ / 26 `SKILL.md` — อ่าน README + `skills/hyperframes/SKILL.md` 2026-10-28):
  - framework ใหญ่ (`SKILL.md` ~0.3% ของ repo) — skill เป็นคู่มือใช้ framework ไม่ใช่ตัวงานเอง · README ระบุใช้กับ Claude Code · Codex · Cursor · Gemini CLI · IBM Bob · Copilot (`npx hyperframes skills update`)
  - `.agents/` กับ `.claude/` เป็น dev skill ของ repo (6 ชื่อ ซ้ำสองที่) · `registry/` 7 ไฟล์เป็น block ของ registry — **ใช้เฉพาะ `skills/` 7 ตัว**
  - ปล่อย release ถี่มาก (v0.8.210 · 10-28) → pin เวอร์ชันของทั้ง CLI และ skill ให้ตรงกัน
- **oh-my-hermes / hermes-official-plugins:** ผูก Hermes Agent (`delegate_task` ฯลฯ) · ใน catalog นี้ Hermes เป็นหนึ่งใน harness เป้าหมาย (§12.4) จึงเก็บไว้เป็น Per-project — ถ้าไม่ได้ใช้ Hermes ข้ามได้ทั้งคู่ · oh-my-hermes ติดตั้งด้วย `curl | sh` → อ่านสคริปต์ก่อน

---

## 7. Single Skills และ Specialist Integrations

| Skill | Repository | ประเภท | สถานะ |
|---|---|---|---|
| Hallmark | <https://github.com/Nutlope/hallmark> | anti-slop frontend (Claude Code / Cursor / Codex) | Choose one กับ taste-skill — benchmark ด้วย brief เดียวกัน |
| claude-code-prompt-improver | <https://github.com/severity1/claude-code-prompt-improver> | Claude hooks + skill | A/B test only — hooks ไม่ portable |
| Graphify | <https://github.com/Graphify-Labs/graphify> | graph CLI + integration skill | Choose one (codebase knowledge) |
| Graft | <https://github.com/NanoNets/Graft> | code graph CLI + MCP + skill adapter | Choose one — ตรวจ config changes และ data egress |
| Claude Code Sub-agents | <https://github.com/lst97/claude-code-sub-agents> | agent definitions (ไม่มี `SKILL.md`) | Reference — port contract เอง |
| CCPlugins | <https://github.com/notlikeDev/CCPlugins> | legacy slash commands | Reference — ตรวจ Git side effects |

---

## 8. Skill Infrastructure และ Governance

### 8.1 autoskills — Discovery/Installer

- <https://github.com/midudev/autoskills> · scan tech stack → เลือก curated skills → verify hash → เขียน lockfile

```bash
npx autoskills --dry-run
```

- ตรวจผลเลือก, source, hash และ file diff ก่อนยืนยัน · เก็บ `skills-lock.json` ใน version control
- สถานะ: **Useful local installer with mandatory review gate**

### 8.2 SkillHub — Team Registry

- <https://github.com/iflytek/skillhub> · publish · version · search · RBAC · audit · self-hosted
- pilot: isolated environment → เปลี่ยน default credentials → กำหนด publisher/reviewer → บังคับ hash/signature/provenance → scan prompt injection ก่อน publish
- สถานะ: **Governance pilot — operationally heavier**

### 8.3 book-to-skill — Skill Generator

- <https://github.com/virgiliojr94/book-to-skill> · `SKILL.md` ไฟล์เดียว · แปลง PDF / EPUB / DOCX / HTML / MD / RTF / MOBI เป็น skill
- เสริม autoskills (สร้าง skill จากเอกสารภายใน) · skill ที่ได้ต้องผ่าน acceptance gate §17 เหมือน skill ภายนอก และระวังลิขสิทธิ์ของหนังสือต้นทาง
- สถานะ: **Add selective**

### 8.4 skill-up — Skill Evaluation

- <https://github.com/alibaba/skill-up> · Go CLI สำหรับ **บันทึกการใช้ skill → สร้าง/รัน eval → ปรับปรุง skill** · มี skill เดียวคือ `skill-upper` (อีก 22 ไฟล์ `SKILL.md` เป็น e2e testdata/examples/fixtures)
- เข้ากับ acceptance gate §17 ข้อ Quality (representative tasks · negative tests · regression) — ใช้กับ skill ที่เขียนเองหรือ fork มา
- README (ส่วน DeepSeek Harness plugin): observation capture แบบ opt-in · regression case ต้องอนุมัติก่อน · รันแบบ isolated · runtime ต่อ case เลือก local / Docker / OpenSandbox
- สถานะ: **Companion** (สำหรับคนดูแล skill) · v0.14.0 ยัง 0.x

### 8.5 cc-safety-net — Guard Hook ก่อนรันคำสั่ง

- <https://github.com/kenryu42/cc-safety-net> · hook ที่ตรวจคำสั่ง shell/git ก่อน agent รัน (บล็อกคำสั่งทำลายล้าง) · README แสดง 16 harness: Claude Code · Codex · Cursor · Copilot CLI · Gemini CLI · Amp · Antigravity CLI · Grok Build · Hermes · Kimi Code · OpenClaw · OpenCode · Pi · Devin CLI · Factory Droid · DeepSeek Harness
- skill ใช้งานมีตัวเดียว (`cc-safety-net` — `disable-model-invocation: true` จึงไม่ถูก router เรียกเอง ใช้อธิบาย/ตั้งค่า/triage false positive) · อีก 5 เป็น dev skill
- README บอกเองว่า **ไม่ใช่ sandbox** (ไม่กั้น process, ไม่ตั้ง permission, ไม่ดู network egress) — เป็นแค่ชั้นกันพลาด
- ทับ: mattpocock `git-guardrails-claude-code` · ECC safety hooks · hooks ของ aidlc/orchestkit — เลือกชั้น guard เดียว
- สถานะ: **Pilot** — วัด false positive บนงานจริงก่อนเปิดทุกโปรเจกต์ · ยังไม่ได้อ่านโค้ด hook

### 8.6 claude-plugins-official — Official Marketplace

- <https://github.com/anthropics/claude-plugins-official> · directory ของ Claude Code plugins (`plugins/` ของ Anthropic + `external_plugins/`) · 33 `SKILL.md` เช่น `skill-creator` · `plugin-dev` (7) · `mcp-server-dev` (3) · `frontend-design` · `claude-security` · `claude-md-improver` · `session-report` · `example-plugin` (2 — ตัวอย่าง)
- license: root Apache-2.0 · `frontend-design` ระบุ "Complete terms in LICENSE.txt" → ไฟล์ใน `skills/frontend-design/LICENSE.txt` เป็น Apache-2.0 (ตรวจ 10-28)
- สถานะ: **Reference** · หยิบ `skill-creator` / `plugin-dev` สำหรับคนเขียน skill/plugin บน Claude Code ได้ (**Add selective**) · `frontend-design` ทับ taste-skill / Hallmark / anti-slop (§14.5) — เลือกฝั่งเดียว

---

## 9. MCP, Memory และ Context Companions

| Tool | Capability | ใช้เมื่อ | ความเสี่ยงหลัก |
|---|---|---|---|
| [headroom](https://github.com/headroomlabs-ai/headroom) | runtime context compression (tool outputs/logs/files/RAG chunks) ลด token 60–95% · library + proxy + MCP + hooks | ลด token ตอน runtime — เสริม maestro ไม่ทับ | compression loss, เพิ่มชั้นใน pipeline |
| [rtk](https://github.com/rtk-ai/rtk) | CLI proxy ลด token ของ command output | ลด token จาก shell/tool output | ผลลัพธ์ถูกตัดก่อนถึง agent |
| [PageIndex](https://github.com/VectifyAI/PageIndex) | reasoning-based document index | RAG แบบไม่ใช้ vector | ต้นทุน model call ตอน index |
| [world-intel-mcp](https://github.com/marc-shade/world-intel-mcp) | global intelligence MCP | research, markets, cyber intel | tool noise, freshness, provenance |
| [TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) | shared memory (chat/skill/wiki/code-graph) | team-level persistent memory | ACL, poisoning, stale memory |
| [ReMe](https://github.com/agentscope-ai/ReMe) | local-first memory เป็นไฟล์ Markdown + wikilink · BM25/embeddings · plugin Claude Code/Codex | memory ส่วนตัวที่ผู้ใช้คุมไฟล์เอง | hook จับบทสนทนาอัตโนมัติ · งาน LLM ส่งเนื้อหาไป endpoint ที่ตั้ง · poisoning/stale memory |
| [memvid](https://github.com/memvid/memvid) | memory layer ไฟล์เดียว (Rust library) · `SKILL.md` = 0 | ต้องการ memory แบบฝังในแอปไม่ใช้ DB | **Reference** — เงียบตั้งแต่ 07-14 · ตัวเลข benchmark อยู่ใน `memvidbench` (LoCoMo 85.65% ตัดสินด้วย gpt-4o-mini — ยังไม่ได้ตรวจ) |
| [claude-context](https://github.com/zilliztech/claude-context) | semantic code search MCP | large-codebase retrieval | embedding cost, code egress |
| [Graphify](https://github.com/Graphify-Labs/graphify) | code/knowledge graph | architecture traversal | hooks/config mutation |
| [Graft](https://github.com/NanoNets/Graft) | repository code graph | navigation, context compression | stale index, data egress |
| [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) | multi-agent codebase graph | onboarding/architecture | token cost, post-commit hooks |

### Choose-one: Codebase Knowledge Layer

```text
Graphify             เน้น graph traversal และหลาย input types
Graft                เน้น CLI/MCP repository context
Understand-Anything  ยอมรับ plugin/multi-agent workflow และ persistent artifacts
```

benchmark ด้วย repository เดียวกัน: setup time · files/configs modified · indexing time · query precision/recall · stale-update behavior · token/API cost · data ที่ออกนอกเครื่อง · uninstall/rollback

---

## 10. Document, RAG และ Extraction Tools

| Tool | Capability | คำแนะนำ |
|---|---|---|
| [MarkPDFdown](https://github.com/MarkPDFdown/markpdfdown) | PDF/image → Markdown ผ่าน multimodal LLM | thin wrapper; benchmark ภาษาไทย ตาราง สูตร และ PII policy |
| [olmocr](https://github.com/allenai/olmocr) | PDF → text ด้วย VLM (Apache-2.0) | ทางเลือก local OCR · เงียบตั้งแต่ 2026-03-25 |
| [Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) | OCR model ของ Baidu (MIT) · repo 14 ไฟล์ — โค้ด/weights อยู่ที่อื่น | **Reference** — เทียบกับ olmocr ถ้าต้องการ local OCR · README ลิงก์ Unlimited-OCR-2 บน Hugging Face + MarathonDocBench (2026-10-27) — ยังไม่ได้ตรวจ |
| [pdfcraft](https://github.com/PDFCraftTool/pdfcraft) | PDF toolkit | ตรวจ **AGPL-3.0** ก่อนฝังในผลิตภัณฑ์ |
| [pdf-mcp](https://github.com/I-CAN-hack/pdf-mcp) | PDF MCP server ขนาดเล็ก | ทดลองได้ · community เล็กมาก |
| [WeKnora](https://github.com/Tencent/WeKnora) | document understanding + RAG framework | ตรวจ license (other) |
| [Morphik Core](https://github.com/morphik-org/morphik-core) | multimodal ingestion/retrieval | ตรวจ **BSL 1.1** |
| [Unstract](https://github.com/Zipstack/unstract) | document → JSON platform/MCP | schema-specific wrapper; ตรวจ **AGPL** |
| [paperless-gpt](https://github.com/icereed/paperless-gpt) | OCR/metadata สำหรับ paperless-ngx | วางหลัง reverse-proxy auth + human approval |
| [knowledge_graph](https://github.com/rahulnyk/knowledge_graph) | corpus → concept graph | reference implementation |
| [Local_Knowledge_Graph](https://github.com/punnerud/Local_Knowledge_Graph) | local Ollama RDF graph | legal review ของ **custom license** ก่อน |

### Wrapper Skill Contract สำหรับ Document Tools

1. input types และ maximum size/page count
2. local vs external model path
3. PII/confidential-document policy
4. prompt-injection handling
5. output schema และ validation
6. checksum/provenance ของ source document
7. human approval ก่อน ingest/publish/replace
8. retry, timeout, cost และ partial-failure behavior

---

## 11. Engineering และ Domain Tool Companions

| Tool | ประเภท | ใช้ร่วมกับ | หมายเหตุ |
|---|---|---|---|
| [witr](https://github.com/pranshuparmar/witr) | process/port/container diagnostic CLI (+1 skill) | diagnose, production-ops | sanitize paths/env · ขอสิทธิ์เมื่อจำเป็น |
| [Scrapy](https://github.com/scrapy/scrapy) | web crawling framework | scraping/research | domain allowlist · robots/ToS · rate limit |
| [open-code-review](https://github.com/alibaba/open-code-review) | code review CLI `ocr` (Go) + 2 skills (`open-code-review` · `open-code-review-delegate` — mirror ใน `plugins/`) | review PR/diff | **ส่ง diff ไป LLM ที่ตั้งค่า** · โหมด delegate ใช้ LLM ของ agent เอง (ไม่ต้องมี API key) · มี OpenTelemetry · Companion — ทับ review skill ของ superpowers/addy/ECC |
| [CodeVibes](https://github.com/danish296/codevibes) | AI code-review application | review/evaluation | benchmark false positives และ privacy ก่อน |
| [Promptflow](https://github.com/microsoft/promptflow) | LLM flow/evaluation | maestro/ECC eval | เฉพาะทีมที่มี dependency อยู่แล้ว |
| [TEN Framework](https://github.com/TEN-framework/ten-framework) | realtime voice/multimodal | voice-agent | audio privacy, consent, latency |
| [full-stack-ai-agent-template](https://github.com/vstorm-co/full-stack-ai-agent-template) | FastAPI/Next.js template | prototype | output ไม่ production-ready โดยอัตโนมัติ |
| [Dive](https://github.com/OpenAgentPlatform/Dive) | desktop MCP/skills host | portability testing | delivery platform ไม่ใช่ skill source |
| [prompt-forge](https://github.com/insaaniManav/prompt-forge) | prompt workbench | prompt QA | **GPL** · provider keys |

---

## 12. การใช้ข้ามแพลตฟอร์ม (Portability)

ตัว skill เป็น markdown จึงพกไปได้เกือบทุกแพลตฟอร์ม — สิ่งที่ต่างคือ **กลไกโหลด** (plugin / `npx skills add` / rules file / MCP) และของแถมที่ผูกแพลตฟอร์ม (hooks · agents · commands · meta-router)

### 12.1 ตาราง Portability

**นิยามสัญลักษณ์:**
- **Documented** (upstream ระบุ): `✓✓` coverage กว้าง · `✓` จำกัด/เฉพาะจุด · `△` มีแต่ upstream ยอมรับข้อจำกัด · `✗` ระบุว่าไม่มี
- **Unknown:** `?` ยังไม่พบเอกสาร — ไม่ใช่ documented absence
- **N/A:** `—` ไม่มีแกนนี้ให้ประเมิน
- **Evidence:** `T` = runtime-tested โดยผู้จัดทำ (มีเฉพาะกลุ่ม diagram ที่รัน CLI จริง 2026-10-15)

> การมี adapter directory **ไม่เท่ากับ feature parity** — `✓` แปลว่า "เอกสารบอกว่ามี" ไม่ใช่ "เห็นมันทำงาน"

| ชุด | Content | Plugin | Hooks | Commands | สรุป |
|---|:-:|:-:|:-:|:-:|---|
| karpathy | ✓✓ | — | — | — | 1 ไฟล์ copy เป็น `.cursorrules` / `.clinerules` / `AGENTS.md` ได้ตรงๆ |
| caveman | ✓✓ | ✓✓ Claude · Cursor · Codex · Gemini | ✓ | ✓ `commands/*.toml` | ตรวจจากไฟล์ใน repo 2026-10-16 · hooks อ่านเนื้อหาเฉพาะฝั่ง Claude (README) · Codex/Cursor มีไฟล์ hooks แต่ยังไม่ได้อ่าน |
| ponytail | ✓✓ | ✓ | ✓ | ? | hooks adapter: Claude/Codex · Copilot · Cursor · Qoder (ตรวจ 10-16) · plugin v5.2.0 (ล่าสุด v5.3.2) |
| superpowers | ✓✓ 14 install targets | ✓✓ | △ | ✗ | hooks: Antigravity รัน session-start ได้ · Hermes ไม่มี post-compaction · ที่เหลือยังไม่ยืนยัน |
| pstack | ✓✓ | ✓ Cursor plugin | ? | ✓ | นอก Cursor ใช้ `pstack-claude` (Claude Code/Codex/Copilot/Pi/OpenCode/Gemini) |
| mattpocock | ✓✓ | — | — | — | `npx skills add` / copy เป็น rules |
| addyosmani | ✓✓ | ✓ | ✗ | — | README รองรับ Gemini CLI / opencode |
| ecc | ✓✓ | ✓✓ CC · Codex · OpenCode (beta) | △ | △ | ระดับต่างกันมาก — §12.1.1 |
| orchestkit | ✓ | ✓ ราย harness | ✓ (171 ตาม README) | ✓ | hooks เยอะที่สุด — ระวัง side effects |
| maestro | ✓✓ 10 providers | ✓ + MCP server | — | ✓ | MCP ใช้กับทุก client ที่รองรับ MCP |
| taste-skill | ✓✓ | ✓ | — | — | มี skill เจาะปลายทาง (§12.2) |
| founder-skills | ✓✓ | — | — | — | business guidance ล้วน |
| ui-skills | ? | CLI ของตัวเอง | ? | ? | ยังไม่ตรวจว่ารองรับ agent ใด |
| ux-ui-agent-skills | ✓ | ✓ Claude Code | ? | ? | v3 README ระบุ Codex · Cursor · Copilot · Gemini CLI · Antigravity · Aider · MCP · Homebrew — กลไกราย harness ยังไม่ได้ตรวจ |
| anti-slop · no-ai-slop | ✓ | — | — | — | markdown ล้วน copy เป็น rules ได้ |
| unslop (heydamir) 🆕 | ✓ | △ Codex metadata (`agents/openai.yaml`) | — | ✓ `/unslop` · `$unslop` | README: Claude Code · Codex · markdown + Node scripts (optional) — harness อื่น copy โฟลเดอร์ได้แต่ยังไม่ได้ตรวจ |
| Infographic | △ | — | — | — | ต้องมี renderer ปลายทาง |
| archify | ✓ | ? | — | ✓ **T** | CLI `bin/archify.mjs` รันผ่าน |
| fireworks-tech-graph | ✓ | ? | — | ✓ **T** | CLI `scripts/fireworks.py` รันผ่าน |
| diagram-design | ✓ | ✓✓ `.claude-plugin` `.codex-plugin` `.factory-plugin` | — | ✓ | `self_check.py` รันผ่าน (**T**) · ไม่มี renderer |
| security-audit-skill | ✓ | ? | — | — | ใช้ผ่านเนื้อหา |
| reverse-skill | △ (governed) | ✗ | ✗ | — | scripts ผูก OS มากกว่าผูก agent |
| rea | ✓ | — | — | — | `.agents/skills/` · gated |
| Privacy-Data-Protection-Skills | ✓ | ✓ | ? | ? | selective ราย jurisdiction |
| ffmpeg-skill | ✓ | ? | — | — | root `SKILL.md` + MCP |
| book-to-skill | ✓ | — | — | — | ไฟล์เดียว |
| Atlas | ✓✓ | — | — | — | markdown ล้วน — ตรวจ frontmatter ก่อน |
| Ruflo | ✓ | ✓ + MCP | △ | ✓ | hooks/config mutation ผูกแพลตฟอร์ม |
| claude-ops | ✓ | — | ✓ daemon | ✓ | pilot isolated |
| aidlc-workflows | ✓✓ 7 harness (Claude · Kiro CLI/IDE · Codex · Cursor · opencode · Copilot) | ✓ `plugins/` | ✓✓ ทุก tool call (Claude) | ✓ `/aidlc` + flags | native binary `aidlc` · hooks หนัก (ดู §4.12) · ตรวจจากไฟล์ใน repo ยังไม่ได้ทดสอบทุก harness |
| CLI-Anything | ✓ (ราย CLI) | ? | — | ✓ CLI `cli-anything-*` | README อ้าง Pi · OpenClaw · nanobot · Cursor · Claude Code · มี Hermes skill (เสนอ) — ยังไม่ได้ตรวจ adapter |
| ReMe | ✓ (7 `SKILL.md`) | ✓ Claude Code · Codex (marketplace) | ✓ `hooks.json` + `auto_memory.py` | — | MCP + CLI + HTTP + Python · integration Hermes/OpenClaw/QwenPaw/DeepSeek Harness ตาม README |
| Unity-MCP · WeKnora | ✓ | ✓ / — | — | — / ✓ CLI | companion |
| Hallmark | ✓✓ | — | — | — | Claude Code / Cursor / Codex |
| prompt-improver | ✓ | Claude only | ✗ | — | hooks ไม่ portable |
| trailofbits/skills | ✓✓ | ✓ Claude Code · Codex | ? | ? | marketplace ทั้งสองฝั่ง (README) |
| bug-hunter | ✓✓ | ? | ? | ✓ `/bug-hunter` | README: Claude Code · Codex · Cursor · Copilot · Kiro · Windsurf · OpenCode · Factory Droid |
| vbsec | ✓ | — | — | ✓ `/vbs-scan-security` | mirror ราย harness: Claude · Codex · Antigravity |
| pya · ghostsecurity · claude-code-owasp | ✓ | Claude only | ? | ? | owasp copy เป็น skill ทั่วไปได้ |
| social-media-research-skills | ✓✓ | — | — | — | `npx skills add` · README: Claude Code · Cursor · Codex · Copilot · Gemini CLI · Windsurf |
| cc-safety-net | ✓ (1 skill) | ✓ | ✓✓ หลาย harness | ? | ตัวตนหลักคือ hook — README แสดง 16 harness |
| HyperFrames | ✓ | ? | — | ✓ CLI | `npx hyperframes skills update` · README: Claude Code · Codex · Cursor · Gemini CLI · IBM Bob · Copilot |
| oh-my-hermes · hermes-official-plugins | Hermes only | ✓ Hermes | ? | ? | ไม่ portable โดยเจตนา |
| open-code-review | ✓ | ✓ Codex · Cursor (plugin) | — | ✓ CLI `ocr` | badge README: Codex · Cursor · Kimi Code |

**superpowers — 14 install targets (13 harness families; Codex App/CLI นับแยก):** Claude Code · Antigravity · Codex App · Codex CLI · Cursor · Devin CLI · Factory Droid · Gemini CLI · Copilot CLI · Grok Build CLI · Kimi Code · OpenCode · Pi · Hermes

#### 12.1.1 ECC — capability ต่อแพลตฟอร์ม (README + `.codex-plugin/README.md`, ตรวจ 2026-08-15)

> **แหล่งข้อมูล:** สังเคราะห์จากหลายส่วนของ README ECC (`Install ECC` · `Codex App and CLI` · `Platform Support` · `Cross-tool capability map` · `Codex macOS app + CLI support in depth`) และ `.codex-plugin/README.md` — ไม่ใช้ matrix ส่วนเดียว เพราะส่วน Codex ใน matrix อธิบาย legacy sync ขณะที่ native-plugin docs ใหม่กว่า · **ไม่ระบุจำนวน platform รวมโดยเจตนา** เพราะ README จัดกลุ่มไม่คงที่และมี directory ที่ไม่มี guide กำกับ

| Status ตาม upstream | Platform | ติดตั้ง | ได้อะไร | ข้อจำกัด |
|---|---|---|---|---|
| Stable primary | Claude Code | plugin / selective installer | skills · agents · commands · hooks · rules · `/ecc:` | ใช้ selective profile เมื่อ context สำคัญ |
| Native plugin *(ทางหลัก)* | Codex App/CLI | `codex plugin marketplace add affaan-m/ECC` → `codex plugin add ecc@ecc` · ใน Codex เรียก `$configure-ecc` | 281 skills · 1 default MCP (Chrome DevTools) · lifecycle-hook projection · scripts · assets | hooks ต้อง trust ผ่าน `/hooks` · verified เฉพาะ synchronous `SessionStart` (Codex 0.146) · handlers ที่ block tools/async/ผิด protocol ถูกตัดออก · plugin state เดียวใน `CODEX_HOME` |
| Sync *(deprecated)* | Codex App/CLI | `scripts/sync-ecc-to-codex.sh` | config 1 · `AGENTS.md` 2 · skills 32 · MCP 6 (7 เมื่อเพิ่ม Supabase) · profiles 2 · roles 3 · copied/merged config ใน `~/.codex` | ไม่มี native-plugin hook runtime |
| Beta project adapter | Cursor | `install.sh --target cursor <lang>` (full) หรือ `--profile minimal` (ย่อ) | 15 hook events (ที่ ECC adapter รองรับ · Cursor platform เปิดให้ 20 · Claude Code ที่ใช้เทียบ 8) · 16 scripts · 34 rules · 48 agents · skills · commands · MCP ผ่าน `.cursor/hooks/adapter.js` | hook set ยังไม่เท่ากัน ([#2419](https://github.com/affaan-m/ECC/issues/2419)) |
| Beta plugin | OpenCode | build plugin | subset ของ catalog | pin Anthropic models ([#2617](https://github.com/affaan-m/ECC/issues/2617)) |
| Instruction-only | GitHub Copilot | instructions + prompt files | instructions เท่านั้น | ไม่มี hooks / agents / skill discovery |
| Experimental | Gemini · Zed · Antigravity · Qwen · Hermes · OpenClaw · Kimi · CodeBuddy · JoyCode | selective target | file placement | ไม่เคลม parity |
| Directory only | Trae · Kiro · Pi | — | มี `.trae/` `.kiro/` `.pi/` ใน repo แต่ไม่มี guide กำกับ | ยังไม่ยืนยัน |

**อ่านอย่างไร:** Cursor ไม่ใช่ "skills + rules เท่านั้น" — เป็น adapter เกือบครบ แต่ upstream ระบุ Beta และ hook set ยังไม่เท่ากัน (`--profile minimal` เป็นตัวเลือกติดตั้ง ไม่ใช่เพดานความสามารถ) · Codex ต้องดูเป็นราย distribution path ไม่ใช่ราย platform · Kimi อยู่กลุ่ม experimental · `/ecc:` namespace ใช้ได้เฉพาะ Claude Code

> README ของ ECC ปนข้อมูล Codex สอง generation — matrix ที่เขียนว่า "No ECC hook runtime" อธิบาย sync path และล้าหลัง native-plugin docs · **อย่าเอาตัวเลขหรือข้อจำกัดของสอง path มารวมกัน** · ตารางเทียบ 4 แหล่งฉบับเต็มอยู่ใน `skill-collections-20260815.md` §12.1.1

### 12.2 taste-skill — จับคู่ skill กับปลายทาง

| ปลายทาง | ตัวที่เกี่ยวข้อง |
|---|---|
| ทุก coding agent | `design-taste-frontend` · style variants · `redesign-existing-projects` · `full-output-enforcement` |
| Codex (เพิ่ม) | `image-to-code` (generate ภาพ design ก่อนแล้ว implement ตามภาพ) |
| ChatGPT / GPT models | `gpt-taste` |
| Google Stitch | `stitch-design-taste` |
| เครื่องมือ generate ภาพ | `imagegen-frontend-web` / `imagegen-frontend-mobile` / `brandkit` |

### 12.3 ข้อสรุปเชิงเลือกใช้

- **ใช้เนื้อหาเดียวกันข้ามแพลตฟอร์มได้ดี:** karpathy · mattpocock · maestro · taste-skill · founder-skills · Hallmark · anti-slop · no-ai-slop · book-to-skill — แต่ **ต้องติดตั้งและตรวจ integration แยกต่อ harness เสมอ**
- **พึ่ง hooks/agents/commands:** superpowers · ecc · orchestkit · caveman · ponytail · aidlc-workflows · ReMe · Ruflo · claude-ops · prompt-improver — ได้เนื้อ skill ทุกที่ ส่วน automation ต้องดูราย harness
- superpowers ยืนยัน hook parity เฉพาะ Antigravity · ECC ต้องอ่านราย distribution path (§12.1.1)
- `--profile minimal` เป็น **ตัวเลือกตอนติดตั้ง** ไม่ใช่เพดานของแพลตฟอร์ม
- **prune skill ต้องตัดสินต่อแพลตฟอร์ม** — เช่น `image-to-code` ไร้ประโยชน์บน Claude Code แต่เป็นตัวหลักบน Codex

### 12.4 Harness ที่อ่าน SKILL.md ได้เอง (ฝั่งผู้บริโภค)

> §12.1 ตอบว่า "upstream ประกาศรองรับ harness ไหน" — ตารางนี้ตอบว่า "harness ไหนอ่าน `SKILL.md` ได้เอง" · อ่านไฟล์ได้ ≠ ใช้งานได้ครบ ต้องตรวจ frontmatter, tool names, scripts, paths, permissions และ smoke test · documented ไม่ใช่ tested (ตรวจ 2026-08-15)

| Harness | อ่าน `SKILL.md` | หลักฐาน | หมายเหตุ |
|---|:-:|---|---|
| Qoder (IDE + CLI) | ✓ native | [extensions/skills](https://docs.qoder.com/extensions/skills) · [cloud-agents/skills](https://docs.qoder.com/cloud-agents/skills) — แต่ละ skill เป็น `SKILL.md` + auxiliary files · model เลือกโหลดจาก description | user-level และ project-level · ทำงานเหมือนกันทั้ง IDE และ CLI |
| Mistral Vibe | ✓ native | [mistralai/mistral-vibe](https://github.com/mistralai/mistral-vibe) — `SkillManager` crawl หา `SKILL.md` | MCP · hooks · permissions · saved sessions · community catalog [agentskill.sh/vibe](https://agentskill.sh/vibe) (ไม่ใช่ upstream evidence) |
| DeepSeek Harness | ✓ compatible | [deepseek.com/harness](https://deepseek.com/harness/en/) · [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — "everything is a plugin" (models · tools · skills · sessions · sandboxes · loops) · repo ใช้ `SKILL.md` ผ่าน `.agents/skills/` | developer preview · `dsh` launcher |
| Grok Build CLI | ✓ ผ่าน plugin | `grok plugin install superpowers@xai-official --trust` | 1 ใน 14 targets ของ superpowers |
| Factory Droid | ✓ ผ่าน plugin | `droid plugin install superpowers@superpowers` | — |
| MiMo CLI | △ คนละ spec | [KoinaAI/MiMo-CLI](https://github.com/KoinaAI/MiMo-CLI) — flat `*.md` ใน `.mimo/skills/` (project) หรือ `~/.mimo-code/skills/` (global) · frontmatter `name` `description` `triggers` (array keyword) `always` (bool) · ต้องประกาศใน `~/.mimo-code/config.json` หรือ `.mimo-code.json` | **ไม่ใช่ drop-in** ต้องแปลงก่อน · มี `AGENTS.md` · hooks (`session_start` `user_prompt` `after_tool`) · MCP stdio · subagents `.mimo/agents/*.md` ครบ |
| Freebuff | ? | [CodebuffAI/freebuff](https://github.com/CodebuffAI/freebuff) — ใช้ `AGENTS.md` + `@codebuff/sdk` | ยังไม่พบหลักฐาน `SKILL.md` |
| Ollama | — | model runner ไม่ใช่ harness | ใช้เป็น backend ของ harness อื่น |

เกณฑ์ที่ควรถามคือ **"อ่านไฟล์รูปแบบไหน และ route ด้วยอะไร"** ไม่ใช่แค่ "มีระบบ skills หรือเปล่า"

**ผลต่อการเลือกใช้:**
- collection ที่เป็น markdown ล้วน (karpathy · mattpocock · addyosmani · founder-skills · taste-skill · Hallmark · anti-slop · no-ai-slop) เป็น candidate สำหรับ pilot บน Qoder / Mistral Vibe / DeepSeek Harness เมื่อวางไฟล์ใน path ที่รองรับ แต่ยังต้องตรวจ frontmatter, tool names, scripts, paths, permissions และ smoke test ราย collection
- collection ที่พึ่ง hooks/agents/commands/namespace (superpowers · ecc · orchestkit · caveman · ponytail · aidlc-workflows · Ruflo) ได้เฉพาะเนื้อ skill — automation ต้องดูราย harness ตาม §12.1
- Mistral Vibe มี integration surface ค่อนข้างกว้างตามเอกสาร upstream (hooks + MCP + permissions) แต่การจัดอันดับเทียบ harness อื่นต้อง benchmark/runtime test แยก
- MiMo CLI รองรับ skills เต็มรูปแบบแต่คนละ spec — ต้องเขียน converter หรือแปลงมือก่อนใช้

---

## 13. Decision Guide ตามชนิดงาน

| สถานการณ์ | Stack/เครื่องมือที่แนะนำ |
|---|---|
| โปรเจกต์ทั่วไปขนาดเล็ก / solo | karpathy + superpowers |
| token เป็นต้นทุนหลัก | rtk/headroom (+ pilot caveman แทน karpathy) |
| ทีมใช้หลาย harness ต้องการ baseline เดียวกัน | pilot ponytail (หลัง audit hooks) |
| อยากได้วินัยแบบ principle-driven | pstack ราย skill (`how` · `why` · `interrogate` · `principle-*`) |
| เน้น reasoning/design ก่อน coding | karpathy + mattpocock (grilling, codebase-design, domain-modeling) |
| full SDLC แบบเบา | karpathy + addyosmani |
| โปรเจกต์ใหญ่/หลาย domain/หลายภาษา | karpathy + ECC แบบ selective (หรือ pilot orchestkit แทน ECC) |
| TypeScript / frontend หนัก | mattpocock + superpowers |
| ความถูกต้องสูง (prod/security) | karpathy + `doubt-driven-development` + `systematic-debugging` |
| สร้าง LLM/RAG/agent product | SDLC stack + maestro (+ headroom ถ้า token เป็นคอขวด) |
| จูนเวิร์กโฟลว์ coding agent เอง | maestro (`/diagnose` → `/fortify` → `/refine`) |
| orchestration platform เต็มรูปแบบ | ประเมิน Ruflo แทน maestro/ECC orchestration |
| Founder/GTM/pricing/SOP | founder-skills แบบ selective |
| Product UI / a11y | ui-skills **หรือ** ux-ui-agent-skills (มี design system/Figma) |
| Landing/portfolio/redesign | taste-skill **หรือ** Hallmark |
| แก้หน้าจอที่ "ดูเป็น AI" ทีละ pass (มีโค้ด · ลิงก์เว็บ · หรือ screenshot) | unslop (heydamir) — Pilot · ไม่ซ้อน `antislop-ui` |
| ข้อความไม่ให้ดูเหมือน AI เขียน | no-ai-slop |
| Infographic/data storytelling | AntV Infographic |
| Architecture diagram จาก codebase | archify |
| SVG diagram ที่ต้องมี gate กันภาพผิด | fireworks-tech-graph |
| Diagram ชนิดพิเศษ (Wardley/Sankey/journey) | diagram-design |
| Defensive security audit | security-audit-skill · หรือ Codex Security official runtime |
| Reverse engineering ที่ได้รับอนุญาต | reverse-skill **หรือ** rea (allowlist + sandbox) |
| Privacy compliance / DPIA | Privacy-Data-Protection-Skills เฉพาะ jurisdiction |
| ประมวลผล video/audio | ffmpeg-skill (root `SKILL.md`) |
| แปลงหนังสือ/เอกสารภายในเป็น skill | book-to-skill + acceptance gate §17 |
| งาน Unity | Unity-MCP เฉพาะโปรเจกต์ |
| Durable background AI workflows | Trigger.dev skills เฉพาะโปรเจกต์ |
| Codebase graph/context | Graphify, Graft หรือ Understand-Anything |
| Team skill registry | SkillHub |
| Auto-select skills ตาม tech stack | autoskills dry-run + human review |
| PDF/document ingestion | MarkPDFdown / olmocr / PageIndex / Unstract wrapper + gates §10 |
| Web crawling | Scrapy wrapper + legal/robots/rate-limit |
| Process/port/container diagnosis | witr wrapper |
| Lifecycle ครบ idea→ops แบบมี gate และตรวจย้อนหลังได้ (org ที่ใช้ AWS/Kiro) | aidlc-workflows — Pilot ในโปรเจกต์แยก ไม่ซ้อน process/SDLC อื่น |
| ให้ agent ควบคุมซอฟต์แวร์ GUI/เดสก์ท็อป (3D, GIS, เสียง, e-book) ที่ไม่มี API | CLI-Anything ราย CLI + ซอฟต์แวร์ต้นทางในเครื่อง |
| memory ข้าม session เป็นไฟล์ Markdown ที่ผู้ใช้คุมเอง | ReMe — Pilot โหมดไม่ใช้ LLM ก่อน |
| หาซอฟต์แวร์ self-hosted ทดแทน SaaS (backend ของ RAG/เอกสาร/memory) | awesome-selfhosted (อ่านเป็นรายการ ไม่ใช่ skill — §21) |
| เครื่องมือ security เฉพาะจุด (semgrep rule, supply chain, constant-time, smart contract) | trailofbits/skills ราย plugin |
| เทียบ audit workflow หลายตัว | benchmark security-audit-skill กับ bug-hunter / pya / vbsec บน repo เดียวกัน (§5.6.1) |
| ความรู้ OWASP ระหว่างเขียนโค้ด | claude-code-owasp แบบ opt-in (ไม่ซ้อน Addy hardening) |
| วิจัย social media / ads / creator | social-media-research-skills (มี API key + งบ) |
| สร้างวิดีโอจาก HTML / slideshow / caption | HyperFrames เฉพาะโปรเจกต์ |
| AI code review ของ diff/PR แบบ CLI | open-code-review (โหมด delegate ถ้าไม่อยากส่ง diff ไป LLM ภายนอก) |
| กันคำสั่งทำลายล้างของ agent | cc-safety-net — Pilot (ไม่ใช่ sandbox) |
| วัดผล/ปรับปรุง skill ที่เขียนเอง | skill-up + acceptance gate §17 |
| ใช้ Hermes Agent เป็น harness หลัก | oh-my-hermes **หรือ** stack ปกติ — ไม่ซ้อน |

---

## 14. Routing และ Collision Rules

### 14.1 Baseline collision

```text
เลือกหนึ่งตัวเป็น global:
  karpathy   กฎพฤติกรรม 4 ข้อ (เล็กที่สุด)
  caveman    บังคับตอบสั้น ลด token (Pilot)
  ponytail   baseline + hooks หลาย harness (Pilot)
```

### 14.2 Process collision

```text
เลือกหนึ่งตัวเป็นหลัก:
  superpowers    วินัยแบบ rigid + meta-router
  pstack         หยิบราย skill — ห้ามเปิดทั้งชุดคู่ superpowers
  aidlc-workflows  workflow engine ที่แทนทั้ง process และ SDLC (§14.3) — Pilot
```

### 14.3 SDLC collision

```text
เลือกหนึ่งตัว:
  mattpocock     thinking/control
  addyosmani     lightweight production playbook
  ecc            broad domain/language framework
  orchestkit     ทางเลือกแทน ecc (hooks หนัก)
  aidlc-workflows  ถ้าเลือกตัวนี้ ไม่ต้องมี process collection (§14.2) และ SDLC collection อื่น
```

### 14.4 Agent workflow collision

```text
เลือกหนึ่งแกนหลัก:
  maestro        audit/refine/context/tools/RAG/guardrails
  ruflo          orchestration/meta-harness/swarm platform
  ECC subset     เมื่อใช้ ECC อยู่แล้วและต้องการบาง agent skills
```

### 14.5 Frontend และ visual collision

```text
product UI / a11y / design system        -> ui-skills OR ux-ui-agent-skills
marketing page / landing / portfolio     -> taste-skill OR Hallmark
anti-slop UI/code (ไม่มี design หลัก)     -> anti-slop
redesign หน้าจอที่ดูเป็น AI ทีละ pass      -> unslop (heydamir) OR antislop-ui
infographic                              -> AntV Infographic
technical diagram                        -> archify OR fireworks OR diagram-design
```

### 14.6 Text anti-slop

```text
no-ai-slop  OR  antislop-copywriting + antislop-human — อย่างใดอย่างหนึ่ง
```

- ชื่อ `unslop` ซ้ำ 2 ตัว: pstack `unslop` = **งานเขียน** (อยู่ฝั่งนี้) · `heydamir/unslop` = **UI** (§14.5) — ถ้าติดตั้งคู่กันใน skills folder เดียว ให้เปลี่ยนชื่อโฟลเดอร์และ `name` ของตัวหนึ่ง (เช่น `unslop-ui`) และตรวจว่า router เลือกถูกตัว

### 14.7 Code-context collision

```text
Graphify OR Graft OR Understand-Anything
อย่าเปิด hooks/indexers หลายชุดกับ repository เดียวก่อน benchmark
```

### 14.8 Security routing

- defensive audit → `security-audit-skill` ก่อนเสมอ · offensive/reverse → `reverse-skill` **หรือ** `rea` ตัวเดียว (รวม plugin `rea` ของ Hermes)
- audit workflow ทั้ง codebase → **ตัวเดียว**: `security-audit-skill` (default) **หรือ** `bug-hunter` / `pya` / `vbsec` / `ghostsecurity` (Pilot) — อย่าเปิดสองตัวที่ trigger "security audit" พร้อมกัน
- เครื่องมือเฉพาะจุด → `trailofbits` ราย plugin (ใช้คู่ workflow ด้านบนได้) · ความรู้ระหว่างเขียนโค้ด → `claude-code-owasp` **หรือ** Addy `security-and-hardening` / ECC `security-review`
- `defending-code-reference-harness` อ่านเป็นแบบอย่าง ไม่ติดตั้ง (ไม่มีคนดูแล)
- security skill ต้องไม่ auto-trigger จากข้อความกำกวม
- ยืนยัน defensive/authorized scope ก่อน
- แยก scan/review ออกจาก exploit/remediation
- network, install, privilege escalation และ destructive actions ต้องมี approval
- เก็บ evidence, command log และ target boundaries

### 14.9 Memory layer collision

```text
เลือกหนึ่งชั้นต่อโปรเจกต์:
  ReMe                    memory เป็นไฟล์ Markdown local (hook + MCP; งาน LLM ส่งเนื้อหาไป endpoint ที่ตั้ง)
  TencentDB-Agent-Memory  shared memory ระดับทีม (ต้องมี ACL/retention)
  maestro `.maestro/`     decision log + audit ในตัว maestro (ไม่ใช่ memory ของบทสนทนาทั่วไป)
  ECC `unified-memory`    เมื่อใช้ ECC อยู่แล้ว
  memvid (Reference)      memory ไฟล์เดียวแบบ library — ฝังในแอปที่เขียนเอง ไม่ใช่ hook ของ agent
```

หลายชั้นพร้อมกัน = บทสนทนาถูกจับซ้ำหลาย hook และ recall ปนกัน (ยังไม่ได้ทดสอบจริง)

### 14.10 Guard และ code review collision

```text
guard ก่อนรันคำสั่ง — เลือกชั้นเดียว:
  cc-safety-net · mattpocock git-guardrails · ECC safety hooks · hooks ของ aidlc/orchestkit
AI review ของ diff — เลือกตัวหลักตัวเดียว:
  open-code-review (CLI) · review skill ของ superpowers/addy/ECC · trailofbits differential-review (security)
```

---

## 15. ความทับซ้อนรายคู่ (Pairwise Overlap)

| คู่ | ทับซ้อน | คำแนะนำ |
|---|:-:|---|
| **karpathy ↔ caveman ↔ ponytail** | **สูง (ทั้งสามคู่)** | baseline เดียวกัน — เลือกตัวเดียว |
| **superpowers ↔ pstack** | **สูง** | tdd / planning / review ซ้ำ — pstack ใช้ราย skill |
| pstack ↔ mattpocock | กลาง | `tdd` `teach` ซ้ำชื่อ — เลือกฝั่งเดียวต่อ skill |
| pstack ↔ maestro | ต่ำ–กลาง | ซ้ำเฉพาะ `reflect` |
| addyosmani ↔ ecc | **สูงมาก** | ecc ครอบ addyosmani — เลือกตัวเดียว |
| **orchestkit ↔ ecc** | **สูงมาก** | full-SDLC + hooks — เลือกตัวเดียว |
| orchestkit ↔ addyosmani | สูง | เลือกตัวเดียว |
| superpowers ↔ addyosmani | กลาง | superpowers เข้มกว่าด้านวินัย |
| mattpocock ↔ ecc | กลาง | ecc กว้างกว่า, mattpocock ลึกด้าน thinking |
| superpowers ↔ mattpocock | ต่ำ | เสริมกัน (process ↔ thinking tools) |
| superpowers ↔ ecc | กลาง | superpowers rigid กว่า |
| karpathy ↔ SDLC/verticals | ~0 | เนื้อหาไม่ชน (ยังนับ context/routing) |
| maestro ↔ ecc | กลาง (subset) | ecc กระจัดกระจาย, maestro รวมศูนย์ + memory/audit |
| maestro ↔ superpowers / addyosmani / mattpocock | ต่ำ | subject ต่าง |
| **maestro ↔ ruflo** | **สูง** | subject เดียวกัน — เลือกตัวเดียว |
| maestro ↔ headroom / rtk | ~0 (เสริมกัน) | ความรู้เรื่อง context budget vs เครื่องจักรลด token |
| headroom ↔ rtk | ต่ำ | คนละจุดใน pipeline (context ทั่วไป vs command output) — ใช้คู่ได้ |
| taste-skill ↔ addyosmani / ecc | กลาง (frontend) | addyosmani `frontend-ui-engineering` กว้างแต่ตื้นกว่า · ecc มี `frontend-design-direction` `design-system` `frontend-patterns` — เลือกฝั่งเดียวสำหรับ frontend design |
| **taste-skill ↔ Hallmark** | **สูงมาก** | เลือกตัวเดียว |
| **taste-skill ↔ ui-skills / ux-ui** | สูง (คนละ surface) | marketing vs product UI — แยก routing |
| **ui-skills ↔ ux-ui-agent-skills** | **สูง** | product UI เดียวกัน — เลือกตัวเดียว |
| ui-skills / ux-ui ↔ addyosmani / ecc | กลาง | frontend/a11y ซ้ำบางส่วน |
| **anti-slop ↔ taste-skill / Hallmark** | **สูง (UI)** | มี design หลักแล้วไม่ต้องเปิด `antislop-ui` |
| **anti-slop ↔ no-ai-slop** | **สูง (text)** | เลือก text skill ฝั่งเดียว (§14.6) |
| **unslop (heydamir) ↔ anti-slop `antislop-ui`** | **สูง (UI)** | audit/แก้ UI หน้าตา AI เหมือนกัน — เลือกตัวเดียว |
| unslop (heydamir) ↔ taste-skill / Hallmark | สูง | ต่างก็กำหนด design direction — มีตัวหลักแล้วไม่ต้องเปิด |
| unslop (heydamir) ↔ ui-skills / ux-ui | กลาง | ui-skills/ux-ui ตรวจ a11y/design system · unslop ปรับรสนิยม — ระวัง token ชนกัน |
| unslop (heydamir) ↔ pstack `unslop` | ต่ำ (เนื้อหา) · **สูง (ชื่อ)** | คนละงาน แต่ชื่อเดียวกัน — เปลี่ยนชื่อก่อนติดตั้งคู่ (§14.6) |
| **archify ↔ fireworks ↔ diagram-design** | **สูง** | เลือกตัวเดียวต่อโปรเจกต์ |
| diagram ↔ Infographic | ต่ำ–กลาง | technical diagram vs data storytelling |
| founder-skills ↔ ecc | ต่ำ–กลาง | founder-skills ลึกกว่าด้าน GTM/pricing |
| founder-skills ↔ claude-ops | ต่ำ | strategy vs ops automation |
| founder-skills ↔ taste-skill | ต่ำ (เฉพาะ CRO/copy) | เสียบร่วมกันได้ |
| Infographic ↔ taste-skill | ต่ำ–กลาง | structured infographic vs page design — คนละ output |
| **reverse-skill ↔ rea** | **สูงมาก** | reverse engineering เดียวกัน — เลือกตัวเดียว |
| reverse-skill / rea ↔ ecc security | สูง | ecc มี `security-review` `bounty-hunter` |
| security-audit-skill ↔ ecc security / addy hardening | กลาง | ใช้ security-audit-skill เป็น workflow audit หลัก |
| Privacy-Data-Protection ↔ ecc healthcare | กลาง | `hipaa-compliance` `healthcare-phi-compliance` ซ้ำ |
| Atlas ↔ superpowers / mattpocock | กลาง | planning/review ซ้ำ — ใช้เป็น reference |
| Atlas ↔ anthropics/skills | สูง | ชื่อ skill ซ้ำ 6 ตัว (§5.9) |
| **Graphify ↔ Graft ↔ Understand-Anything** | **สูงมาก** | เลือกตัวเดียว |
| **aidlc-workflows ↔ superpowers / pstack** | **สูงมาก** | workflow + gate ทั้งวงจรซ้ำกับ process discipline — ใช้ aidlc แทน |
| **aidlc-workflows ↔ mattpocock / addyosmani / ECC / orchestkit** | **สูงมาก** | spec→plan→build→ship ซ้ำ — เลือกตัวเดียว |
| **ReMe ↔ TencentDB-Agent-Memory** | **สูง** | memory ของบทสนทนาเหมือนกัน (ส่วนตัว vs ทีม) — เลือกชั้นเดียว (§14.9) |
| ReMe ↔ maestro `.maestro/` | ต่ำ–กลาง | `.maestro/` เป็น decision log + audit ของ workflow ไม่ใช่ memory ของบทสนทนา — ใช้คู่กันได้ถ้า hook ไม่จับซ้ำ |
| CLI-Anything ↔ ffmpeg-skill / Unity-MCP / diagram tools | ต่ำ–กลาง | ซ้อนเฉพาะงานซอฟต์แวร์ตัวเดียวกัน (เช่น วิดีโอ, Unity) — เลือกเครื่องมือเดียวต่อซอฟต์แวร์ |
| **security-audit-skill ↔ bug-hunter ↔ pya ↔ vbsec ↔ ghostsecurity** | **สูง** | audit ทั้ง codebase ด้วย sub-agents เหมือนกัน — เลือกตัวเดียว |
| trailofbits ↔ security-audit-skill | ต่ำ–กลาง | เครื่องมือเฉพาะจุด vs workflow — ใช้คู่ได้ · `differential-review` ทับ review ทั่วไป |
| trailofbits ↔ ECC security / Addy hardening | กลาง | หยิบเฉพาะ plugin ที่ ECC/Addy ไม่มี |
| claude-code-owasp ↔ Addy `security-and-hardening` / ECC `security-review` | สูง | knowledge layer เดียวกัน — เลือกตัวเดียว |
| **oh-my-hermes ↔ superpowers / ECC / maestro** | **สูงมาก** | ครอบ Layer 1–3 บน Hermes — ใช้แทน ไม่ซ้อน |
| hermes-official-plugins `rea` ↔ morluto/rea | สูงมาก | skill เดียวกันคนละ distribution — Restricted ทั้งคู่ เลือกตัวเดียว |
| claude-plugins-official `frontend-design` ↔ taste-skill / Hallmark | สูง | design direction — เลือกตัวเดียว |
| claude-plugins-official `skill-creator` ↔ book-to-skill / skill-up | ต่ำ–กลาง | สร้าง skill vs แปลงเอกสาร vs วัดผล — คนละขั้น |
| HyperFrames ↔ ffmpeg-skill | ต่ำ | สร้างวิดีโอจาก HTML vs ประมวลผลไฟล์ — ใช้คู่ได้ |
| open-code-review ↔ superpowers / addy / ECC review | กลาง | review ของ diff ซ้ำ — เลือกตัวหลัก (§14.10) |
| cc-safety-net ↔ mattpocock git-guardrails / ECC hooks | สูง | guard ชั้นเดียว (§14.10) |
| harness-engineering ↔ claude-code-best-practice | กลาง | reference เรื่อง `.claude/` + enforcement — อ่านคู่ได้ |
| memvid ↔ ReMe / TencentDB-Agent-Memory | กลาง | memory คนละรูปแบบ (library vs file vs service) — §14.9 |

---

## 16. Installation Guidance

> ตรวจ README และ pin revision ก่อนติดตั้งจริง — คำสั่ง upstream เปลี่ยนตามเวลา

### Core collections

```bash
npx skills add multica-ai/andrej-karpathy-skills          # karpathy
npx skills add https://github.com/obra/superpowers        # superpowers (เนื้อ skill; native plugin ดู §12.1)
npx skills@latest add mattpocock/skills                   # mattpocock
npx skills add addyosmani/agent-skills                    # addyosmani
npx skills add https://github.com/affaan-m/ECC            # ecc (เนื้อ skill นอก Claude Code)
npx skills add sharpdeveye/maestro                        # maestro
npx skills add https://github.com/Leonxlnx/taste-skill    # taste-skill
```

**Claude Code (native plugin):** superpowers ใช้ marketplace `obra/superpowers-marketplace` → `plugin install superpowers` · ecc/addyosmani ใช้ marketplace plugin

### Verticals เดิม

```bash
npx skills add https://github.com/ognjengt/founder-skills
npx ui-skills start
npx skills add https://github.com/antvis/Infographic
npx skills add nutlope/hallmark
npx autoskills --dry-run
```

### Candidates รอบ 2026-10-15

> **ยังไม่ได้ทดสอบคำสั่งติดตั้ง** — ใช้ installation path ตาม README ของแต่ละ repo · repo ที่เป็น markdown ล้วน (anti-slop, no-ai-slop, book-to-skill) มักใช้ `npx skills add <repo-url>` ได้ แต่ต้องยืนยันก่อน · **Atlas ไม่ติดตั้ง** (ไม่มี license — §5.9)

- **มี plugin/adapter ของตัวเอง — ใช้ทางของ upstream:** caveman · ponytail · pstack (Cursor plugin) / pstack-claude · orchestkit · diagram-design · Unity-MCP
- **มี CLI ต้องติดตั้ง runtime:** archify (Node) · fireworks-tech-graph (Python + `cairosvg`/`ffmpeg` optional) · rtk · witr · ffmpeg-skill (Python 3.9)
- **ติดตั้งเฉพาะไฟล์ที่ต้องการ:** ffmpeg-skill (root `SKILL.md` เท่านั้น) · Privacy-Data-Protection-Skills (ราย jurisdiction) · pstack (ราย skill) · CLI-Anything (ราย CLI — ครั้งแรกไม่ใส่ `-g -y`)
- **รอบเพิ่ม 4 repo (อ่านจากเอกสาร ยังไม่ได้ติดตั้งทดสอบ):** aidlc-workflows — **ใส่ `--version x.y.z` เสมอ** (ค่าเริ่มต้นคือ `releases/latest`) · ReMe — `pip install "reme-ai[core]"` ใน venv แยก (SKILL.md ของ ReMe เองบอกให้ถามผู้ใช้ก่อน) · CLI-Anything — `pip` ใน venv แยกต่อ CLI · awesome-selfhosted — ไม่ติดตั้ง (รายการ)

### Candidates รอบ 2026-10-28

> **ยังไม่ได้ทดสอบคำสั่งติดตั้ง** — อ่านจาก README เท่านั้น

- **marketplace/plugin ของ upstream:** trailofbits (Claude Code · Codex) · ghostsecurity · pya · claude-code-owasp · harness-engineering · claude-plugins-official (Claude Code) · HyperFrames (`npx hyperframes skills update`)
- **`npx skills add`:** social-media-research-skills (+ `SCRAPECREATORS_API_KEY`)
- **มี binary/CLI ต้องติดตั้ง:** open-code-review (`ocr`) · skill-up (Go) · cc-safety-net (hook) · Traceway CLI · เครื่องมือ Ghost
- **curl | sh:** oh-my-hermes → อ่านสคริปต์ก่อน pin tag
- **ติดตั้งเฉพาะไฟล์ที่ต้องการ:** trailofbits (ราย plugin) · HyperFrames (`skills/` 7 ตัว ไม่เอา `.agents/` `.claude/` `registry/`) · vbsec (mirror เดียวตาม harness) · skill-up (`skills/skill-upper` เท่านั้น)

### Candidates รอบ 2026-11-04

> **ยังไม่ได้ทดสอบคำสั่งติดตั้ง** — อ่านจาก README เท่านั้น

- **unslop (heydamir):** copy เฉพาะ `skills/unslop/` (ไม่เอา `examples/`) · pin commit `a6f121e` (HEAD 2026-11-01) · ถ้ามี pstack `unslop` อยู่แล้วให้เปลี่ยนชื่อก่อน

```bash
git clone https://github.com/heydamir/unslop && git -C unslop checkout a6f121e
mkdir -p ~/.claude/skills && cp -r unslop/skills/unslop ~/.claude/skills/      # Claude Code
mkdir -p ~/.agents/skills && cp -r unslop/skills/unslop ~/.agents/skills/      # Codex
```

- Playwright (`npm install -D playwright` + `npx playwright install chromium`) และ ffmpeg ติดตั้งเฉพาะเมื่อจะใช้ snapshot/วิดีโอ — คำสั่ง npm จะแก้ `package.json` ของโปรเจกต์
- image MCP (fal · Replicate · OpenAI images · Higgsfield) **ไม่ต้องเชื่อม** จนกว่าจะตั้งงบ

### ห้ามติดตั้งอัตโนมัติทั้ง repo

`reverse-skill` · `rea` · `claude-ops` · `claude-code-guide` · `trailofbits/skills` · `oh-my-hermes` · `awesome-agentic-ai` (§21) → clone/inspect → เลือกโมดูล → pin revision → ติดตั้งผ่าน governed process

สำหรับ Ruflo, Codex Security, Trigger.dev, SkillHub, Graphify, Graft, Understand-Anything, headroom ให้ใช้ installation path ของผลิตภัณฑ์และตรวจ side effects ทุกครั้ง

---

## 17. Acceptance Gate ก่อนรับ Skill/Pack ใหม่

### Structure

- [ ] มี `SKILL.md` และ frontmatter ถูกต้อง
- [ ] ชื่อ, description, trigger และ scope สอดคล้องกัน
- [ ] references/scripts ใช้ progressive loading
- [ ] ไม่มี router description ซ้ำกับ skill ที่ติดตั้งอยู่
- [ ] แยก skill ที่ใช้งานจริงออกจาก mirror และ dev-workflow skill ของ repo
- [ ] เทียบจำนวนไฟล์ทั้ง repo กับจำนวน `SKILL.md` — ratio ต่ำ (< ~3%) ต้องเปิดดูว่าที่เหลือคือ runtime/installer ที่รันได้ หรือแค่ตัวอย่าง/asset · ถ้ามี installer ให้ติดตั้งแบบ skill-only แทน

### Quality

- [ ] มี representative tasks และ expected outputs
- [ ] มี negative/non-trigger tests
- [ ] ผ่าน regression test บน runtime เป้าหมาย
- [ ] ไม่มี claims ที่ไม่มีหลักฐานหรือ technical references ที่ล้าสมัย

### Security and governance

- [ ] ระบุ upstream, commit/version, **license** และ checksum — repo ที่ไม่มี license ห้ามใช้เชิงพาณิชย์จนกว่าเจ้าของยืนยัน
- [ ] ตรวจว่า skill ไม่ได้ก๊อปมาจากแหล่งอื่นที่มี license ต่างกัน
- [ ] review scripts, hooks, daemons, network calls และ dependency installation
- [ ] มี credential/data-egress policy
- [ ] มี human approval สำหรับ destructive, security, ingestion และ publish actions
- [ ] มี rollback/uninstall path

### Cost and operations

- [ ] วัดขนาด `SKILL.md` และ references
- [ ] วัด token/tool discovery overhead
- [ ] ตรวจ files/configs ที่ installer แก้ไข
- [ ] กำหนด timeout/retry/cost ceiling
- [ ] ดู maintenance cadence (§3.0) ประกอบการเลือก
- [ ] ไม่เปิด overlapping collections เกินความจำเป็น

---

## 18. สถานะ Catalog

| กลุ่ม | รายการ | สถานะ |
|---|---|---|
| Behavioral baseline | karpathy · caveman · ponytail | karpathy = Keep (default) · caveman / ponytail = Pilot |
| Process discipline | superpowers · pstack / pstack-claude | Choose one (superpowers = default · pstack ราย skill) |
| SDLC | mattpocock · addyosmani · ECC · orchestkit | Choose one |
| Agent workflow | maestro · Ruflo | Choose one (maestro = Keep when relevant · Ruflo = Pilot) |
| Design direction | taste-skill · Hallmark | Choose one |
| Product UI | ui-skills · ux-ui-agent-skills | Choose one (Add opt-in) |
| Anti-slop | anti-slop · no-ai-slop | Add selective ราย surface |
| Anti-slop UI redesign 🆕 | unslop (heydamir) | Pilot · Choose one กับ `antislop-ui` |
| Business | founder-skills | Add selective |
| Infographic | AntV Infographic | Add selective |
| Diagram | archify · fireworks-tech-graph · diagram-design | Choose one ต่อโปรเจกต์ |
| Security (defensive) | security-audit-skill | Add selective |
| Security (research tools) | trailofbits/skills | Add selective ราย plugin (CC-BY-SA) |
| Security (audit workflow ทางเลือก) | bug-hunter · pya · vbsec · ghostsecurity | Pilot — choose one กับ security-audit-skill |
| Security (knowledge) | claude-code-owasp | Add opt-in |
| Security (reference) | defending-code-reference-harness | Reference (unmaintained) |
| Security (reverse) | reverse-skill · rea | Restricted · choose one |
| Compliance | Privacy-Data-Protection-Skills | Add selective ราย jurisdiction |
| Media | ffmpeg-skill | Add selective (root file) |
| Social research | social-media-research-skills | Add opt-in (API เสียเงิน) |
| Methodology | Atlas · claude-code-best-practice | Reference (Atlas ไม่มี license) |
| Ops automation | claude-ops | Pilot (isolated) |
| Lifecycle workflow engine | aidlc-workflows | Pilot — โปรเจกต์แยก · แทน process+SDLC ไม่ซ้อน |
| Software-to-CLI harness | CLI-Anything | Add selective ราย CLI |
| Agent memory | ReMe | Pilot — เลือกหนึ่งชั้น (§14.9) |
| Large external catalog | claude-code-guide | Reference — curate only |
| Product-specific | Codex Security · Trigger.dev · typesafe-ai · Unity-MCP · HyperFrames · Traceway | Per-project |
| Hermes-specific | oh-my-hermes · hermes-official-plugins | Per-project (Hermes เท่านั้น) |
| Methodology reference | harness-engineering · claude-plugins-official | Reference (claude-plugins-official หยิบ `skill-creator`/`plugin-dev` ได้) |
| Code graph/context | Graphify · Graft · Understand-Anything | Choose one after benchmark |
| Skill infrastructure | autoskills · SkillHub · book-to-skill · skill-up | Dry-run + review · Governance pilot · Add selective · Companion |
| Guard hook | cc-safety-net | Pilot |
| Code review CLI | open-code-review | Companion |
| Runtime token reduction | headroom · rtk | Companion — ใช้คู่กันได้ |
| MCP/tools/frameworks | รายการใน §9–§11 | Companion |
| ไม่เข้าเกณฑ์ | รายการใน §21 | Excluded |

### สรุปสั้น (1 บรรทัด/ชุด)

- **karpathy** → นิสัยเขียนโค้ดที่ดี 1 ไฟล์ ใส่ทุกโปรเจกต์
- **caveman** → baseline ที่บังคับตอบสั้น ประหยัด token
- **ponytail** → baseline พร้อม hooks และ adapter หลาย harness
- **superpowers** → วินัยกระบวนการที่บังคับทำตามเป๊ะ
- **pstack** → สไตล์ agent แบบ poteto — หยิบหลักการและ skill รายตัว
- **mattpocock** → เครื่องมือคิด/วางแผนสำหรับ engineer ที่อยากคุมเอง
- **addyosmani** → playbook ครบ SDLC แบบเบา spec→ship
- **ecc** → ซูเปอร์มาร์เก็ตครบทุกภาษา/domain/orchestration หยิบเฉพาะที่ใช้
- **orchestkit** → คู่แข่ง ecc ที่ hooks หนัก community เล็ก
- **maestro** → โค้ชเวิร์กโฟลว์ของ AI agent พร้อม memory/audit/cost — เงียบตั้งแต่ เม.ย.
- **taste-skill** → รสนิยม design สำหรับ landing/portfolio ระวัง context ~87KB
- **ui-skills / ux-ui-agent-skills** → ผู้ตรวจ product UI (ตัวหลังเน้น design system/Figma)
- **anti-slop / no-ai-slop** → กันงานหน้าตา AI (UI-code / text)
- **unslop (heydamir)** 🆕 → นักออกแบบที่ redline หน้าจอ AI ทีละ pass — ภาพ hero เสียเงิน ต้องถามก่อน
- **founder-skills** → ที่ปรึกษาธุรกิจ GTM/pricing/SOP
- **Infographic** → โรงงาน infographic ผูก renderer ของ AntV
- **archify / fireworks / diagram-design** → diagram ครบ pipeline / เข้ม gate / หลายชนิด
- **security-audit-skill** → audit แบบ defensive จาก Cloudflare
- **reverse-skill / rea** → reverse engineering ที่ต้องมีใบอนุญาตก่อนแตะ
- **Privacy-Data-Protection-Skills** → คลัง compliance ใหญ่ หยิบราย jurisdiction
- **ffmpeg-skill** → media processing ด้วย stdlib ล้วน
- **headroom / rtk** → เครื่องลด token ตอน runtime ไม่ใช่ skill
- **aidlc-workflows** → workflow engine 33 stage/11 scope ของ AWS ที่ผูก hook ทุก tool call — Pilot ในโปรเจกต์แยก
- **CLI-Anything** → registry ของ CLI ที่ให้ agent ใช้ซอฟต์แวร์จริง — หยิบราย CLI ระวัง supply chain ของ hub
- **ReMe** → memory เป็นไฟล์ Markdown local — โหมด LLM ส่งบทสนทนาไป endpoint ที่ตั้ง
- **trailofbits/skills** → กล่องเครื่องมือ security ของ Trail of Bits 95 skills — หยิบราย plugin ระวัง share-alike
- **bug-hunter / pya / vbsec / ghostsecurity** → audit workflow ทางเลือก community เล็ก — เลือกได้ตัวเดียวกับ security-audit-skill
- **claude-code-owasp** → OWASP 2025/2026 ในไฟล์เดียว
- **defending-code-reference-harness** → แบบอย่าง defensive harness ของ Anthropic ที่ไม่มีคนดูแลแล้ว
- **social-media-research-skills** → นักวิจัย social/ads ที่ต้องจ่ายค่า API
- **HyperFrames** → ทำวิดีโอจาก HTML เฉพาะโปรเจกต์ที่ใช้ framework นี้
- **oh-my-hermes / hermes-official-plugins** → ของ Hermes Agent เท่านั้น
- **skill-up** → วัดผลและปรับปรุง skill ด้วย eval
- **cc-safety-net** → hook กันคำสั่งพัง ไม่ใช่ sandbox
- **open-code-review** → CLI review diff ของ Alibaba
- **claude-plugins-official** → marketplace ทางการของ Claude Code — อ่าน/หยิบบางตัว

---

## 19. ภาคผนวก

ตารางเปรียบเทียบละเอียด A–F (Identity · Positioning · Capability matrix แกน A ราย phase · จุดแข็ง/จุดอ่อน · Capability matrix แกน B) ของ 7 core collections เดิม แยกไว้ใน `skill-collections-appendix-20261111.md` (ไม่จำเป็นต่อการใช้ไฟล์นี้) — **repo ที่เข้ารอบ 10-15 / 10-16 / 10-28 / 11-04 ยังไม่อยู่ใน matrix** (รอบ 11-11 ไม่มีตัวใหม่)

ข้อสรุปหลักจากภาคผนวก:
- แถว **Observability/logging** มีแค่ addyosmani ที่ครอบเต็ม
- **domain packs และ language patterns** เป็น moat ของ ecc บนแกน A
- **workflow slop linter · persistent memory · audit + cost · effectiveness scorecard** เป็น moat ของ maestro บนแกน B — รอบ 10-15 ไม่ได้ประเมินว่ามีชุดใหม่ที่แทนได้หรือไม่
- headroom เด่นแถวเดียว (context budget ตอน runtime) แต่เป็นแถวที่ไม่มี skill ใดทำได้จริง จึงใช้คู่ ไม่ใช่แทน

---

## 20. แหล่งอ้างอิง

### Core collections

- karpathy — <https://github.com/multica-ai/andrej-karpathy-skills>
- caveman — <https://github.com/JuliusBrussee/caveman>
- ponytail — <https://github.com/DietrichGebert/ponytail>
- superpowers — <https://github.com/obra/superpowers> · marketplace `obra/superpowers-marketplace`
- pstack — <https://github.com/cursor/plugins/tree/main/pstack> · port: <https://github.com/michael-denyer/pstack-claude>
- mattpocock — <https://github.com/mattpocock/skills>
- addyosmani — <https://github.com/addyosmani/agent-skills>
- ecc — <https://github.com/affaan-m/ECC>
- orchestkit — <https://github.com/yonatangross/orchestkit>
- maestro — <https://github.com/sharpdeveye/maestro> · MCP `maestro-workflow-mcp` · VS Code `sharpdeveye.maestro-workflow`
- taste-skill — <https://github.com/Leonxlnx/taste-skill> · <https://tasteskill.dev>
- aidlc-workflows — <https://github.com/awslabs/aidlc-workflows>

### Hybrid ที่มีหัวข้อละเอียด (§6)

- CLI-Anything — <https://github.com/HKUDS/CLI-Anything> · hub <https://hkuds.github.io/CLI-Anything/>
- ReMe — <https://github.com/agentscope-ai/ReMe> · docs <https://reme.agentscope.io>
- HyperFrames — <https://github.com/heygen-com/hyperframes>

### Security candidates รอบ 10-28 (§5.6.1)

- trailofbits — <https://github.com/trailofbits/skills> · defending-code — <https://github.com/anthropics/defending-code-reference-harness>

### repo อื่นทั้งหมด

ลิงก์ของ verticals, hybrid/product-specific packs, infrastructure และ tools อยู่ในตารางของ §5–§11 (ไม่ซ้ำที่นี่เพื่อไม่ให้ลิงก์เพี้ยนระหว่างสองที่)

### Harness (§12.4)

- <https://docs.qoder.com/extensions/skills> · <https://github.com/mistralai/mistral-vibe> · <https://github.com/deepseek-ai/deepseek-harness> · <https://github.com/xai-org/plugin-marketplace> · <https://github.com/KoinaAI/MiMo-CLI> · <https://github.com/CodebuffAI/freebuff>

### References (ไม่ติดตั้ง)

- <https://github.com/asgeirtj/system_prompts_leaks> — คลัง system prompt จาก vendor

---

## 21. Repositories ที่ประเมินแล้วไม่เข้าเกณฑ์ Collection

| Repository | ประเภทจริง | เหตุผล |
|---|---|---|
| [`OrchestratorInc/agent-orchestrator`](https://github.com/OrchestratorInc/agent-orchestrator) *(10-28)* | แอป desktop/mobile คุม coding agent 30+ ตัว (Apache-2.0) | application/runtime ไม่ใช่ skill content · 14 `SKILL.md` เป็น dev skill + integration (`using-ao`, `ao-*`) ของแอปเอง · **README ระบุเก็บ telemetry (install ID, GitHub username)** · ถ้าต้องการ orchestration platform ให้ประเมินแยกเทียบ Ruflo (§14.4) |
| [`adriannoes/awesome-agentic-ai`](https://github.com/adriannoes/awesome-agentic-ai) *(10-28)* | hub/awesome list ที่ **vendor** skill ของ repo อื่น (408 `SKILL.md`, 16,240 ไฟล์) | สำเนาของ pstack · mattpocock · taste-skill · bug-hunter · anthropic-cybersecurity-skills ฯลฯ — ติดตั้งจาก upstream แทน (สำเนา drift + license ต้นทางไม่ตาม root MIT) · ใช้เป็นรายการค้นหาได้ |
| `jub0t/Concat` *(10-28)* | video editor แทน CapCut (Rust · **AGPL-3.0**) | แอป · 2 `SKILL.md` เป็น dev skill · มี MCP/JSON-RPC แต่ยังไม่ได้ทดสอบ |
| `Comfy-Org/ComfyUI` *(10-28)* | diffusion GUI/engine (GPL-3.0) | `SKILL.md` = 0 |
| `future-agi/traceAI` *(10-28)* | OTel tracing SDK สำหรับ AI app | `SKILL.md` = 0 · library |
| `AprilNEA/OpenLogi` *(10-28)* | แอปแทน Logitech Options+ (MIT + Apache-2.0 — API ตอบ Apache-2.0) | 8 `SKILL.md` เป็น dev skill ของ repo |
| `agentuniverse-ai/agentUniverse` *(10-28)* | multi-agent framework | `SKILL.md` = 0 |
| `WhitzardAgent/AgentGuard` *(10-28)* | runtime guard framework (GPL-3.0) | `SKILL.md` = 0 (`skills/` เป็น Python module) · guard แบบเบาดู cc-safety-net (§8.5) |
| `memvid/memvidbench` *(10-28)* | benchmark ของ memvid (⭐ 6 · ไม่มี LICENSE · เงียบตั้งแต่ 2026-01-10) | ไม่ใช่ skill · ตัวเลข LoCoMo ใช้อ้างอิงเท่านั้น |
| [`awesome-selfhosted/awesome-selfhosted`](https://github.com/awesome-selfhosted/awesome-selfhosted) *(10-16)* | รายการซอฟต์แวร์ self-hosted (CC-BY-SA-3.0 — API ตอบ `NOASSERTION`) | ไม่มี `SKILL.md` (6 ไฟล์) · **README ~330 KB อย่าโหลดเข้า context ทั้งไฟล์** · ใช้เป็นแหล่งหา backend self-hosted สำหรับ RAG/เอกสาร/memory (§10–§11) · ข้อมูลจริงอยู่ที่ repo `awesome-selfhosted-data` |
| `LockedinLabs-AI/agent-console` *(10-15)* | — | repo หาย (Gone · 11-11 ยัง 404) — ตัดจนกว่า URL ใช้ได้ |
| `tonhowtf/omniget` *(10-15)* | — | 404 (ยืนยันซ้ำ 11-11) — ตัดจนกว่า URL ใช้ได้ |
| `blue-yonder/tsfresh` *(10-15)* | Python library | ไม่มี `SKILL.md` |
| `Botspot/pi-apps` *(10-15)* | app store สำหรับ Raspberry Pi (GPL-3.0) | ไม่มี `SKILL.md` |
| `ConduitPlatform/Conduit` *(10-15)* | backend template | ไม่มี `SKILL.md` |
| `johnxie/awesome-code-docs` *(10-15)* | awesome list | reference |
| `awesome-opencode/awesome-opencode` *(10-15)* | awesome list (CC0) | reference |
| `666ghj/MiroFish` *(10-15)* | swarm engine (AGPL-3.0) | ไม่มี `SKILL.md` |
| `rahulnyk/knowledge_graph` | notebook/pipeline | ไม่มี installable skills |
| `marc-shade/world-intel-mcp` | MCP server | เพิ่ม tools ไม่เพิ่ม skill content |
| `danish296/codevibes` | application | external evaluator |
| `TencentDB-Agent-Memory` | memory service | adapter ไม่ทำให้เป็น collection |
| `full-stack-ai-agent-template` | template | application scaffold |
| `MarkPDFdown` | CLI/API | ต้องทำ wrapper |
| `autoskills` | installer | จัดการ skills ไม่ใช่ content |
| `Local_Knowledge_Graph` | Python/Ollama framework | custom license |
| `claude-code-sub-agents` | agent definitions | ไม่มี `SKILL.md` |
| `Dive` | desktop MCP host | runtime platform |
| `claude-context` | semantic-search MCP | retrieval service |
| `prompt-forge` | prompt workbench | QA application |
| `CCPlugins` → `brennercruvinel/CCPlugins` | slash commands | ไม่ใช่ Agent Skills · **11-04: ย้ายจาก `notlikeDev/CCPlugins` และ archived แล้ว** · 11-11 ยัง archived (push ล่าสุดยัง 2026-09-11 · เงียบ 61 วัน) |
| `Morphik Core` | retrieval platform | service/framework |
| `Scrapy` | crawling framework | library |
| `Promptflow` | LLM workflow framework | platform |
| `TEN Framework` | realtime agent framework | domain runtime |
| `paperless-gpt` | document application | ผูก paperless-ngx |
| `Unstract` | extraction platform | service/MCP |
| `SkillHub` | registry | infrastructure |
| `headroomlabs-ai/headroom` | runtime compression | `SKILL.md` = 0 (ยืนยันซ้ำ 10-15) — ใช้เป็น tool เสริมแกน B ได้ (§9) |
| `PageIndex` · `olmocr` · `pdfcraft` · `pdf-mcp` *(10-15)* | tools | `SKILL.md` = 0 — Companion |
| `asgeirtj/system_prompts_leaks` | คลัง system prompt (CC0) | reference ให้คนศึกษา · ส่วน `bundled-skills/` ติดมากับ Claude Code อยู่แล้ว · เป็น prompt ที่หลุดมา ไม่ควร copy ไปใช้ |

> **ตรวจสถานะ 2026-11-11 (38 repo ในตารางนี้ที่ระบุ owner ได้):** เข้าถึงได้ 36 (นับ CCPlugins) · หาย 2 (`agent-console` · `omniget`) · rename + archived 1 (`CCPlugins` — เหมือน 11-04) · เงียบเกิน 60 วัน: `prompt-forge` (~15.9 เดือน) · `claude-code-sub-agents` (~14.9 เดือน) · `memvidbench` (~10.0 เดือน) · `codevibes` (~9.9 เดือน) · `tsfresh` · `claude-context` · `Dive` · `Local_Knowledge_Graph` · `knowledge_graph` · `CCPlugins` (61 วัน — เข้ากลุ่มรอบนี้) — ไม่กระทบคำตัดสิน (ตัดออกอยู่แล้ว) · ตัวเลขดิบอยู่ที่ `skill-collections-repo-analysis-20261111.md` §7


**เกณฑ์:** skill collection ต้อง "ติดตั้งแล้วเปลี่ยนพฤติกรรม agent ได้" (มี `SKILL.md` + frontmatter ให้ router เลือกโหลด) — passive reference ไม่นับ

---

## 22. Change Log

> ประวัติทุกรอบอยู่ใน `skill-collections-changelog.md` (ต่อท้ายด้วย `skill-collections-changelog-entry-20261111.md`) · ที่นี่สรุปเฉพาะสองรอบล่าสุด · ตัวเลข ⭐ ดู §3.0

### 2026-11-11 (ฉบับ 20261111)

**เพิ่ม:** ไม่มี repo ใหม่ · ตัดออก 0

**เปลี่ยน:** **refresh §3.0 ทุกแถว (66)** — เรียงดาวใหม่ · (+x%) เทียบ 11-04 · cadence เขียนใหม่ (เงียบ >60 วัน 9 ตัวเท่าเดิม · defending-code ข้ามเกณฑ์ตัวหนา ~3 เดือนครั้งแรก · ดาวพุ่ง unslop/security-audit-skill/social-media-research-skills · maestro และ hermes-official-plugins พ้นกลุ่ม community เล็ก · release ใหม่ 22 ตัว · บรรทัดหลักไม่มี major) · ไม่มี repo ถูก archive/rename · license ไม่เปลี่ยน · §21: ตรวจสถานะ 38 repo — agent-console / omniget ยัง 404 · CCPlugins ยัง archived · ไม่เปลี่ยนคำตัดสินใด — ข้อที่ควรทบทวนอยู่ใน changelog-entry

**ตัด/ย้าย:** Change Log รอบ 2026-10-28 ย้ายไป `skill-collections-changelog.md` (ข้อความอยู่ท้าย `skill-collections-changelog-entry-20261111.md`) · หลักฐานรอบนี้ → `skill-collections-repo-analysis-20261111.md` · ภาคผนวก → `skill-collections-appendix-20261111.md` (matrix เดิม)

### 2026-11-04 (ฉบับ 20261104)

**เพิ่ม:** ตรวจ repo ใหม่ 1 ตัว → รับเข้า 1 · ตัดออก 0
- §5.3.1 ใหม่: `heydamir/unslop` (Pilot · Choose one กับ `antislop-ui`) · audit `SKILL.md` + references + scripts ทั้ง 2 ไฟล์
- แถวใหม่ §1 · §1.3 · §3.0 · §3.3 · §12.1 · §13 · §14.5 · §14.6 (ชื่อชนกับ pstack `unslop`) · §15 · §16 (Candidates รอบ 2026-11-04) · §18

**เปลี่ยน:** 🆕 ใช้กับรอบ 11-04 (ถอดของรอบ 10-28 ออก) · **refresh §3.0 ทุกแถว (66)** — เรียงดาวใหม่ · (+x%) เทียบ 10-28 · cadence เขียนใหม่ (เงียบ >60 วัน 9 ตัว · Atlas กลับมา · ดาวพุ่ง ffmpeg-skill/hallmark/oh-my-hermes/security-audit-skill · release ใหม่ 24 ตัว) · ไม่มี repo ถูก archive/rename · §21: ตรวจสถานะ 38 repo — CCPlugins rename + archived · ไม่เปลี่ยนคำตัดสินใด — ข้อที่ควรทบทวนอยู่ใน changelog-entry

**ตัด/ย้าย:** Change Log รอบ 2026-10-16 ย้ายไป `skill-collections-changelog.md` (ข้อความอยู่ท้าย `skill-collections-changelog-entry-20261104.md`) · หลักฐานรอบนี้ → `skill-collections-repo-analysis-20261104.md` · ภาคผนวก → `skill-collections-appendix-20261104.md` (matrix เดิม)
