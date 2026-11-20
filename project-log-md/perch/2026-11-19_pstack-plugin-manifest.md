# Pstack plugin manifest — HR-IMS

| Field | Value |
|---|---|
| **วันที่** | 20 พฤศจิกายน 2569 (Asia/Bangkok) |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Revision** | โค้ดที่ merge ใน `e27cfd9` (PR #38) |
| **สถานะ** | 🟡 ใช้ประกอบการติดตั้งใหม่ — ทดสอบสคริปต์ recreate ในโฟลเดอร์ชั่วคราวแล้วได้ 40+40 สกิล ไม่มี BOM (20 พ.ย. 2569) ยังไม่ได้ทดสอบ clone สะอาด |

## ทำไมต้องมี manifest

`.gitignore:150` ตัด `.perch/plugins/` ออกจาก Git ไฟล์ plugin ทั้งสองชุดจึงอยู่เฉพาะเครื่องที่ตั้งค่าไว้ คนที่ clone repo ใหม่จะได้โค้ดแต่ไม่ได้ pstack skills 80 ตัวที่ session 19 พฤศจิกายนใช้ผ่าน Perch

เอกสารนี้เก็บสิ่งที่ clone ใหม่ต้องมี **เวอร์ชัน แหล่งที่มา รายชื่อสกิลที่คาดหวัง และวิธีสร้าง plugin ให้ทำซ้ำได้** ตัวไฟล์จริงยังไม่เข้า repo เพราะเป็นโค้ดของ plugin ภายนอกและมีขนาดใหญ่

## แหล่งที่มาและเวอร์ชัน

| รายการ | ค่า |
|---|---|
| ต้นทาง | https://github.com/michael-denyer/pstack-claude |
| เวอร์ชัน | `0.9.139` |
| ใบอนุญาต | MIT |
| ตำแหน่งในเครื่องนี้ | `~/.claude/plugins/cache/pstack-claude/pstack/0.9.139` (67 สกิล) + `~/.agents/skills` (อีก 13 สกิล) |
| วิธีติดตั้งต้นทาง | Claude Code plugin marketplace `pstack-claude` |
| วันที่ตรวจล่าสุด | 20 พฤศจิกายน 2569 |

**ข้อค้นพบตอนตรวจสอบ manifest:** cache `0.9.139` มีแค่ 67 สกิล ทุกเวอร์ชันใน cache มี 67 เท่ากัน อีก 13 ตัวที่อยู่ใน plugin จริงมาจาก `~/.agents/skills` ได้แก่ `ask-matt`, `blueprint`, `domain-modeling`, `extract-pattern`, `find-skills`, `plan-canvas`, `prp-validate-plan`, `pstack-reflect`, `pstack-tdd`, `to-prd`, `ubiquitous-language`, `writing-plans`, `writing-skills` สคริปต์ด้านล่างจึง copy จาก cache ก่อนแล้วค่อย fallback มาที่ `~/.agents/skills` |

`plugin.json` ของทั้งสองชุดระบุ `$schema: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, `version: 0.9.139`, `description: pstack skills group`

## โครงสร้างที่ Perch ต้องเจอ

```
.perch/plugins/
├── pstack-a/
│   ├── plugin.json
│   └── skills/          40 directories, each with SKILL.md
└── pstack-b/
    ├── plugin.json
    └── skills/          40 directories, each with SKILL.md
```

ข้อจำกัดที่ตรวจแล้วจาก `2026-11-19_perch-cli-skill-limit-mechanism.md`:

- ต้องเป็นไฟล์จริง ไม่ใช่ junction เพราะ Perch ตรวจ realpath containment
- `plugin.json` ต้องไม่มี BOM เขียนด้วย UTF-8 ไม่มี BOM
- `$schema` บังคับ
- เพดาน 40 สกิลต่อโฟลเดอร์, 16 plugin ต่อโฟลเดอร์, 96 รวมทุก scope

## รายชื่อสกิลที่คาดหวัง (80 ตัว)

### pstack-a (40)

architect, arena, ask-matt, automate-me, babysit, benchmark-checklist, blast-radius, blueprint, bro, correct, create-formal-verification-skill, create-verification-skill, deslop, domain-modeling, extract-pattern, figure-it-out, find-skills, fix-ci, fix-merge-conflicts, get-pr-comments, how, interrogate, in-your-own-words, ketchup, ketchup-video, maintain-formal-verification-skill, maintain-verification-skill, make-pr-easy-to-review, no-comments, plan-canvas, poteto-help, poteto-mode, principle-attack-the-premise, principle-boundary-discipline, principle-build-the-lever, principle-encode-lessons-in-structure, principle-exhaust-the-design-space, principle-experience-first, principle-explain-the-number, principle-fix-root-causes

### pstack-b (40)

principle-foundational-thinking, principle-guard-the-context-window, principle-laziness-protocol, principle-make-operations-idempotent, principle-migrate-callers-then-delete-legacy-apis, principle-minimize-reader-load, principle-model-the-domain, principle-never-block-on-the-human, principle-outcome-oriented-execution, principle-prove-it-works, principle-redesign-from-first-principles, principle-separate-before-serializing-shared-state, principle-sequence-verifiable-units, principle-subtract-before-you-add, principle-test-behavior-not-implementation, principle-type-system-discipline, prp-validate-plan, pstack-reflect, pstack-tdd, recall, reflect, setup-pstack, sharpen, show-me-your-work, statechart, swarm, tdd, teach, technical-writing, thermo-nuclear-code-quality-review, thermo-nuclear-review, thermos, to-prd, typescript-best-practices, ubiquitous-language, unslop, what-did-i-get-done, why, writing-plans, writing-skills

`writing-skills` อยู่ใน pstack-b แล้ว ตรวจจากโฟลเดอร์จริงวันที่ 20 พฤศจิกายน 2569 บันทึกใน session summary 12:44 ที่บอกว่าตัวนี้หลุดเป็นสถานะก่อนหน้านี้

## วิธีสร้างใหม่บนเครื่องที่ติดตั้ง pstack แล้ว

รันจาก root ของ repo ใน PowerShell หลัง clone ใหม่ ต้องมี pstack `0.9.139` ใน Claude plugin cache และสกิล 13 ตัวที่ระบุข้างบนใน `~/.agents/skills` ก่อน

```powershell
$src = "$env:USERPROFILE\.claude\plugins\cache\pstack-claude\pstack\0.9.139\skills"
$fallback = "$env:USERPROFILE\.agents\skills"
$root = Join-Path (Get-Location) '.perch\plugins'
$groups = @{
  'pstack-a' = @(
    'architect', 'arena', 'ask-matt', 'automate-me', 'babysit', 'benchmark-checklist',
    'blast-radius', 'blueprint', 'bro', 'correct', 'create-formal-verification-skill',
    'create-verification-skill', 'deslop', 'domain-modeling', 'extract-pattern',
    'figure-it-out', 'find-skills', 'fix-ci', 'fix-merge-conflicts', 'get-pr-comments',
    'how', 'interrogate', 'in-your-own-words', 'ketchup', 'ketchup-video',
    'maintain-formal-verification-skill', 'maintain-verification-skill',
    'make-pr-easy-to-review', 'no-comments', 'plan-canvas', 'poteto-help', 'poteto-mode',
    'principle-attack-the-premise', 'principle-boundary-discipline',
    'principle-build-the-lever', 'principle-encode-lessons-in-structure',
    'principle-exhaust-the-design-space', 'principle-experience-first',
    'principle-explain-the-number', 'principle-fix-root-causes'
  )
  'pstack-b' = @(
    'principle-foundational-thinking', 'principle-guard-the-context-window',
    'principle-laziness-protocol', 'principle-make-operations-idempotent',
    'principle-migrate-callers-then-delete-legacy-apis', 'principle-minimize-reader-load',
    'principle-model-the-domain', 'principle-never-block-on-the-human',
    'principle-outcome-oriented-execution', 'principle-prove-it-works',
    'principle-redesign-from-first-principles',
    'principle-separate-before-serializing-shared-state',
    'principle-sequence-verifiable-units', 'principle-subtract-before-you-add',
    'principle-test-behavior-not-implementation', 'principle-type-system-discipline',
    'prp-validate-plan', 'pstack-reflect', 'pstack-tdd', 'recall', 'reflect',
    'setup-pstack', 'sharpen', 'show-me-your-work', 'statechart', 'swarm', 'tdd',
    'teach', 'technical-writing', 'thermo-nuclear-code-quality-review',
    'thermo-nuclear-review', 'thermos', 'to-prd', 'typescript-best-practices',
    'ubiquitous-language', 'unslop', 'what-did-i-get-done', 'why', 'writing-plans',
    'writing-skills'
  )
}
foreach ($name in $groups.Keys) {
  $dest = Join-Path $root "$name\skills"
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  foreach ($skill in $groups[$name]) {
    $from = Join-Path $src $skill
    if (-not (Test-Path -LiteralPath $from)) {
      $from = Join-Path $fallback $skill
    }
    if (-not (Test-Path -LiteralPath $from)) {
      throw "Missing source for skill: $skill"
    }
    Copy-Item -LiteralPath $from -Destination $dest -Recurse -Force
  }
  $plugin = @{
    '$schema' = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
    name = $name
    version = '0.9.139'
    description = 'pstack skills group'
  } | ConvertTo-Json
  [System.IO.File]::WriteAllText(
    (Join-Path $root "$name\plugin.json"),
    $plugin,
    [System.Text.UTF8Encoding]::new($false)
  )
}
```

ตรวจหลังรัน:

```powershell
perch skills | Select-String 'pstack-'
```

ต้องเห็น 80 ชื่อขึ้นต้น `pstack-a:` หรือ `pstack-b:` แล้ว restart Perch ก่อนเรียกใช้ เพราะ registry อ่านตอนเริ่ม session

## รายชื่อกับการเรียกใช้เป็นหลักฐานคนละอย่าง

Codex ชี้ว่าตัวเลข 80/80 ใน session summary 12:44 ยืนยันเฉพาะการมองเห็นใน `perch skills` เพราะชื่อใน plugin ถูก prefix เป็น `pstack-a:architect` แต่ `perch skills <name>` ไม่รับทั้งชื่อเต็มและชื่อเปล่า

| ประเภทหลักฐาน | ผลที่ recorded | ข้อจำกัด |
|---|---|---|
| รายชื่อ `perch skills` | 80/80 (40 + 40) | ยืนยัน discovery และการ parse `plugin.json` |
| การเรียกใช้ `perch skills <name>` | ยังไม่มีผล recorded | ไม่รับชื่อ prefix หรือชื่อเปล่าของสกิลใน plugin |
| การเรียกใช้จริงผ่าน `loadSkill` | ยังไม่มีผล recorded กับ plugin นี้ | ต้อง restart หลังสร้าง plugin แล้วทดสอบใน session ใหม่ |

งานที่ยังต้องทำ: เก็บผลเรียกใช้สกิลตัวแทน เช่น `poteto-mode` หรือ `technical-writing` ผ่าน `loadSkill` ใน session ใหม่ แล้วบันทึกชื่อสกิล วันเวลา และผลที่ได้ไว้คู่กับ manifest นี้

## สิ่งที่ manifest นี้ยังไม่ปิด

- ทดสอบสคริปต์ recreate ในโฟลเดอร์ชั่วคราวแล้ว ผล `pstack-a : skills=40 BOM=False`, `pstack-b : skills=40 BOM=False` วันที่ 20 พฤศจิกายน 2569 ยังไม่ได้ทดสอบกับ clone สะอาดและ profile ใหม่ตามที่ Codex แนะนำ
- ยังไม่มีผลเรียกใช้สกิลตัวแทน
- ถ้า pstack ออกเวอร์ชันใหม่ ต้องอัปเดต `version` ใน manifest และ `plugin.json` ทั้งสองชุดพร้อมกัน
- `.agents/skills` ของ HR-IMS มี 16 ตัวที่ยังอยู่ใน repo และกินงบ 96 ร่วมกับ plugin ทั้งสองชุด
