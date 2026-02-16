# Research Plan: Tag Generator & Scanner Improvement

## Metadata

| Field | Value |
|-------|-------|
| Date | 2026-02-13 |
| Topic | Tag Generator & Scanner Improvement |
| Domain | MIXED: CODEBASE (primary), TECHNICAL, ARCHITECTURE |
| Complexity | HIGH |
| Team Size | 6 researchers |
| Sub-questions | 7 |
| Tasks | 10 |

---

## Research Question

**Primary Question**: Improve the tag generator to create both QR codes and barcodes with item selection, and fix the scanner feature (barcode/QR reader plugin not responding to device input). Additionally, inspect all application workflows (stock, user/role management, department/sub-department, item management, barcode/QR generation, categories, scanner, borrow, withdraw, and other features) to ensure comprehensive understanding and identify improvement opportunities.

---

## Research Question Decomposition

| ID | Sub-question | Domain | Parallel | Dependencies | Assigned To |
|----|-------------|--------|----------|--------------|-------------|
| SQ-1 | What is the current tag generator implementation (files, libraries, data flow)? | CODEBASE | Yes | NONE | Code Analyst |
| SQ-2 | How does the scanner feature work and why is it not responding to device input? | CODEBASE | Yes | NONE | Scanner Debugger |
| SQ-3 | What are the complete workflows for stock, user/role, department, items, categories, borrow, withdraw? | CODEBASE | Yes | NONE | Workflow Mapper |
| SQ-4 | What are the best QR code and barcode generation libraries for Next.js/React with TypeScript? | TECHNICAL | Yes | NONE | Library Researcher |
| SQ-5 | How should the improved tag generator be designed (architecture, UI, API)? | ARCHITECTURE | No | SQ-1, SQ-4 | Solution Architect |
| SQ-6 | What are the integration requirements for barcode/QR scanner devices in web applications? | TECHNICAL | No | SQ-2 | Scanner Integration Analyst |
| SQ-7 | Synthesis: Complete improvement plan for tag generator and scanner | SYNTHESIS | No | SQ-1 to SQ-6 | Lead Synthesizer |

### Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │                                     │
SQ-1 (generator) ───┼──► SQ-5 (design) ──────────────────┼──┐
                    │                                     │  │
SQ-4 (libraries) ───┘                                     │  │
                                                          │  │
SQ-2 (scanner) ───────► SQ-6 (device integration) ────────┼──┼──► SQ-7 (synthesis)
                                                          │  │
SQ-3 (workflows) ─────────────────────────────────────────┘  │
                                                             │
                                                    [All findings]
```

---

## Team Composition

### 1. Code Analyst (Tag Generator)

- **Focus**: Analyze current tag generator implementation including files, components, libraries, and data flow
- **Sub-questions**: SQ-1
- **Model**: sonnet
- **Output format**: Structured report with file locations, code snippets, library identification, data flow diagram
- **Completion criteria**: All tag generator files identified, current library documented, data flow mapped

**Spawn prompt**:
> You are a Code Analyst specializing in Next.js/React applications.
>
> **Your Mission**: Analyze the current tag generator implementation in the HR-IMS application.
>
> **Tasks**:
> 1. Find all files related to tag/label/QR/barcode generation in `frontend/next-app/`
> 2. Identify what libraries are currently used for QR/barcode generation
> 3. Map the data flow: how items are selected → how tags are generated → how they're displayed/printed
> 4. Document the current capabilities (QR only? Barcode only? Both?)
> 5. Identify any limitations or issues in the current implementation
>
> **Methodology**:
> - Search for files containing: "qr", "barcode", "tag", "label", "generate"
> - Read component files in `app/(dashboard)/` and `components/`
> - Check `package.json` for installed libraries
> - Analyze Server Actions in `lib/actions/` for tag generation logic
>
> **Output Format**:
> ```markdown
> ## Tag Generator Analysis
>
> ### Files Identified
> - `path/to/file.tsx` - Purpose
>
> ### Current Libraries
> - Library name, version, capabilities
>
> ### Data Flow
> 1. Step 1
> 2. Step 2...
>
> ### Current Capabilities
> - [ ] QR Code generation
> - [ ] Barcode generation
> - [ ] Item selection
> - [ ] Batch generation
>
> ### Issues/Limitations
> - Issue 1
> - Issue 2
> ```
>
> **Quality Bar**: Every claim must be supported by file path and line number. No assumptions.
>
> **Completion**: Update task RT-1 with your findings when complete.

---

### 2. Scanner Debugger

- **Focus**: Investigate why the scanner plugin is not responding to device input
- **Sub-questions**: SQ-2
- **Model**: sonnet
- **Output format**: Root cause analysis with code references, error logs, and browser API usage
- **Completion criteria**: Scanner code analyzed, potential causes identified, browser API usage documented

**Spawn prompt**:
> You are a Scanner Debugger specializing in web-based barcode/QR scanner integration.
>
> **Your Mission**: Investigate why the scanner feature is not responding to device input in HR-IMS.
>
> **Tasks**:
> 1. Find all scanner-related files in `frontend/next-app/`
> 2. Identify what scanner library/plugin is being used
> 3. Analyze the scanner initialization and event handling code
> 4. Check browser API usage (getUserMedia, MediaDevices, etc.)
> 5. Look for error handling and logging
> 6. Identify potential causes for "no response" issue
>
> **Methodology**:
> - Search for files containing: "scanner", "scan", "camera", "getUserMedia", "MediaDevices"
> - Check `app/(dashboard)/scanner/` page
> - Look for WebRTC or camera access code
> - Check browser console for potential errors (document what errors to look for)
> - Analyze event listeners and callback functions
>
> **Output Format**:
> ```markdown
> ## Scanner Analysis
>
> ### Files Identified
> - `path/to/file.tsx` - Purpose
>
> ### Scanner Library
> - Library name, version, documentation link
>
> ### Device Access Implementation
> - How camera/input device is accessed
> - Permissions handling
>
> ### Event Handling
> - How scan events are captured
> - Callback chain
>
> ### Potential Issues
> 1. **Issue**: Description
>    - Location: file:line
>    - Likely cause: ...
>    - Suggested fix: ...
>
> ### Browser Compatibility Notes
> - Chrome/Firefox/Safari considerations
> ```
>
> **Quality Bar**: Every technical claim must reference specific code. Include browser API documentation references.
>
> **Completion**: Update task RT-2 with your findings when complete.

---

### 3. Workflow Mapper

- **Focus**: Document all application workflows to provide comprehensive system understanding
- **Sub-questions**: SQ-3
- **Model**: sonnet
- **Output format**: Workflow documentation with page routes, Server Actions, and user flows
- **Completion criteria**: All specified workflows documented with entry points, actions, and outcomes

**Spawn prompt**:
> You are a Workflow Mapper specializing in enterprise application documentation.
>
> **Your Mission**: Document all major workflows in the HR-IMS application.
>
> **Workflows to Document**:
> 1. Stock management (view, update, transfer)
> 2. User/Role management (create, assign, modify)
> 3. Department/Sub-department management
> 4. Item management (create, update, delete)
> 5. Barcode/QR generation
> 6. Category management
> 7. Scanner operation
> 8. Borrow workflow
> 9. Withdraw workflow
> 10. Any other discovered workflows
>
> **Methodology**:
> - Explore `app/(dashboard)/` for page routes
> - Analyze `lib/actions/` for Server Actions
> - Check `components/` for UI components
> - Map database models via `backend/prisma/schema.prisma`
>
> **Output Format**:
> ```markdown
> ## Workflow Documentation
>
> ### Workflow: [Name]
> - **Entry Point**: `/route/path`
> - **Components**: `component/path.tsx`
> - **Server Actions**: `actionName()` in `lib/actions/file.ts`
> - **Database Models**: Model1, Model2
> - **User Flow**:
>   1. Step 1
>   2. Step 2...
> - **Roles Required**: admin, user, etc.
> - **Audit Points**: Where audit logs are created
> ```
>
> **Quality Bar**: Every workflow must trace from UI → Server Action → Database → Response.
>
> **Completion**: Update task RT-3 with your findings when complete.

---

### 4. Library Researcher

- **Focus**: Research best QR code and barcode generation libraries for Next.js/React
- **Sub-questions**: SQ-4
- **Model**: sonnet
- **Output format**: Comparative analysis with library recommendations, features, and integration examples
- **Completion criteria**: 3-5 libraries compared, recommendation with rationale provided

**Spawn prompt**:
> You are a Library Researcher specializing in JavaScript/TypeScript ecosystem evaluation.
>
> **Your Mission**: Research and compare QR code and barcode generation libraries suitable for Next.js 16 with TypeScript.
>
> **Requirements**:
> - Must support both QR Code AND Barcode (Code128, EAN-13, etc.) generation
> - Must work with Next.js App Router (Server Components + Client Components)
> - TypeScript support required
> - Good performance for batch generation
> - Active maintenance (updated in 2024-2025)
>
> **Tasks**:
> 1. Research QR code libraries (qrcode.react, qr-code-styling, etc.)
> 2. Research barcode libraries (JsBarcode, react-barcode, etc.)
> 3. Identify unified solutions if any (supporting both QR and barcode)
> 4. Compare bundle sizes, features, and DX
> 5. Provide code examples for integration
>
> **Methodology**:
> - Search npm for relevant packages
> - Check GitHub stars, issues, recent commits
> - Read documentation for TypeScript support
> - Evaluate Server vs Client component compatibility
>
> **Output Format**:
> ```markdown
> ## Library Research
>
> ### QR Code Libraries
> | Library | Stars | Last Update | Bundle Size | TypeScript | Notes |
>
> ### Barcode Libraries
> | Library | Stars | Last Update | Bundle Size | TypeScript | Notes |
>
> ### Recommended Stack
> - **QR Code**: library name
>   - Rationale: ...
>   - Example code: ...
> - **Barcode**: library name
>   - Rationale: ...
>   - Example code: ...
>
> ### Integration Considerations
> - Server Component vs Client Component usage
> - Batch generation approach
> - Print-friendly output options
> ```
>
> **Quality Bar**: Include npm package links, GitHub links, and actual code snippets.
>
> **Completion**: Update task RT-4 with your findings when complete.

---

### 5. Solution Architect

- **Focus**: Design the improved tag generator architecture supporting both QR and barcode
- **Sub-questions**: SQ-5
- **Model**: opus
- **Output format**: Architecture design with component structure, API design, and implementation plan
- **Completion criteria**: Complete design document with file structure, component hierarchy, and data models

**Spawn prompt**:
> You are a Solution Architect specializing in Next.js application design.
>
> **Your Mission**: Design an improved tag generator that supports both QR codes and barcodes with item selection.
>
> **Context** (from previous research):
> - Current implementation analysis will be provided by Code Analyst
> - Library recommendations will be provided by Library Researcher
>
> **Design Requirements**:
> 1. Support both QR Code and Barcode generation
> 2. Allow item selection before generating tags
> 3. Support batch generation (multiple items at once)
> 4. Print-friendly output
> 5. Consistent with existing HR-IMS UI patterns (Shadcn UI, Tailwind)
>
> **Deliverables**:
> 1. Component architecture diagram
> 2. File structure proposal
> 3. Server Action design
> 4. Data model changes (if needed)
> 5. UI/UX flow
> 6. Implementation checklist
>
> **Methodology**:
> - Review findings from SQ-1 (current implementation) and SQ-4 (libraries)
> - Design follows existing patterns in HR-IMS
> - Consider Server vs Client component boundaries
> - Plan for audit logging integration
>
> **Output Format**:
> ```markdown
> ## Tag Generator Design
>
> ### Architecture Overview
> - High-level diagram
>
> ### Proposed File Structure
> ```
> frontend/next-app/
> ├── app/(dashboard)/tags/
> │   ├── page.tsx
> │   └── components/
> ├── components/tags/
> │   ├── TagGenerator.tsx
> │   ├── QRCodeGenerator.tsx
> │   └── BarcodeGenerator.tsx
> ├── lib/actions/tags.ts
> ```
>
> ### Component Design
> - Component 1: Props, State, Responsibilities
>
> ### Server Actions
> - `generateTags(items: Item[], type: 'qr' | 'barcode')`
>
> ### UI/UX Flow
> 1. Select items from inventory
> 2. Choose tag type (QR/Barcode)
> 3. Configure options
> 4. Generate preview
> 5. Print/download
>
> ### Implementation Checklist
> - [ ] Task 1
> - [ ] Task 2
> ```
>
> **Quality Bar**: Design must be implementable without further research. Include specific file paths and function signatures.
>
> **Completion**: Update task RT-5 with your findings when complete.

---

### 6. Scanner Integration Analyst

- **Focus**: Research and propose scanner device integration solutions
- **Sub-questions**: SQ-6
- **Model**: sonnet
- **Output format**: Integration guide with code examples and troubleshooting steps
- **Completion criteria**: Clear integration path documented with working code examples

**Spawn prompt**:
> You are a Scanner Integration Analyst specializing in web-based hardware integration.
>
> **Your Mission**: Document how to properly integrate barcode/QR scanner devices with web applications.
>
> **Context** (from previous research):
> - Current scanner implementation analysis will be provided by Scanner Debugger
>
> **Tasks**:
> 1. Research browser APIs for scanner access (MediaDevices, WebRTC, WebHID)
> 2. Document common scanner connection methods:
>    - Camera-based scanning
>    - USB HID scanners (keyboard emulation)
>    - Bluetooth scanners
> 3. Provide integration code examples for each method
> 4. Document troubleshooting steps for "no response" issues
> 5. List browser compatibility considerations
>
> **Methodology**:
> - Research MDN documentation for relevant APIs
> - Check existing HR-IMS scanner implementation (from SQ-2)
> - Identify best practices from popular scanner libraries
>
> **Output Format**:
> ```markdown
> ## Scanner Integration Guide
>
> ### Connection Methods
> 1. **Camera-based**: Description, pros/cons
> 2. **USB HID**: Description, pros/cons
> 3. **Bluetooth**: Description, pros/cons
>
> ### Integration Code Examples
> ```typescript
> // Camera-based example
> // USB HID example
> ```
>
> ### Troubleshooting Checklist
> - [ ] Browser permissions granted
> - [ ] Device properly connected
> - [ ] Correct API usage
> - [ ] Event listeners attached
>
> ### Browser Compatibility
> | Browser | Camera | USB HID | Bluetooth |
> |---------|--------|---------|-----------|
> | Chrome | ✅ | ✅ | ✅ |
>
> ### Recommended Implementation
> - Method: ...
> - Rationale: ...
> - Code: ...
> ```
>
> **Quality Bar**: Include actual working code examples with TypeScript types.
>
> **Completion**: Update task RT-6 with your findings when complete.

---

### 7. Lead Synthesizer

- **Focus**: Integrate all findings into a comprehensive improvement plan
- **Sub-questions**: SQ-7
- **Model**: opus
- **Output format**: Executive summary with actionable implementation plan
- **Completion criteria**: Complete synthesis document with prioritized action items

**Spawn prompt**:
> You are a Lead Synthesizer specializing in technical report compilation.
>
> **Your Mission**: Integrate all research findings into a comprehensive improvement plan for the tag generator and scanner features.
>
> **Input Sources**:
> - RT-1: Tag Generator Analysis (Code Analyst)
> - RT-2: Scanner Analysis (Scanner Debugger)
> - RT-3: Workflow Documentation (Workflow Mapper)
> - RT-4: Library Research (Library Researcher)
> - RT-5: Design Proposal (Solution Architect)
> - RT-6: Scanner Integration Guide (Scanner Integration Analyst)
>
> **Deliverables**:
> 1. Executive Summary (3 paragraphs max)
> 2. Key Findings (bulleted list)
> 3. Improvement Plan (prioritized)
>    - Phase 1: Critical fixes
>    - Phase 2: Enhancements
>    - Phase 3: Future considerations
> 4. Implementation Roadmap with effort estimates
> 5. Risk Assessment
> 6. Resource Requirements
>
> **Output Format**:
> ```markdown
> # Tag Generator & Scanner Improvement Plan
>
> ## Executive Summary
> [3 paragraphs answering the original research question]
>
> ## Key Findings
> - Finding 1 (Source: RT-X, Confidence: HIGH/MEDIUM/LOW)
> - Finding 2...
>
> ## Improvement Plan
>
> ### Phase 1: Critical Fixes (Priority: HIGH)
> - Task 1: Description
>   - Files to modify: ...
>   - Effort: S/M/L
>   - Dependencies: ...
>
> ### Phase 2: Feature Enhancements (Priority: MEDIUM)
> ...
>
> ### Phase 3: Future Considerations (Priority: LOW)
> ...
>
> ## Implementation Roadmap
> | Phase | Tasks | Estimated Effort | Dependencies |
>
> ## Risk Assessment
> | Risk | Probability | Impact | Mitigation |
>
> ## Resource Requirements
> - Libraries to install: ...
> - Configuration changes: ...
> - Database migrations: ...
> ```
>
> **Quality Bar**: Every recommendation must trace back to specific research findings with citations.
>
> **Completion**: Update task RT-7 with your findings when complete.

---

## Research Tasks

### Wave 1: Foundation (Parallel)

| ID | Title | Assignee | Type | Dependencies | Acceptance Criteria | Effort |
|----|-------|----------|------|-------------|---------------------|--------|
| RT-1 | Analyze tag generator implementation | Code Analyst | RESEARCH | NONE | All files identified, current library documented, data flow mapped | MEDIUM |
| RT-2 | Debug scanner no-response issue | Scanner Debugger | RESEARCH | NONE | Scanner code analyzed, potential causes identified, browser API usage documented | MEDIUM |
| RT-3 | Document all application workflows | Workflow Mapper | RESEARCH | NONE | All 10+ workflows documented with entry points, actions, and outcomes | HIGH |
| RT-4 | Research QR/Barcode libraries | Library Researcher | RESEARCH | NONE | 3-5 libraries compared, recommendation with rationale provided | LOW |

### Wave 2: Deep Analysis

| ID | Title | Assignee | Type | Dependencies | Acceptance Criteria | Effort |
|----|-------|----------|------|-------------|---------------------|--------|
| RT-5 | Design improved tag generator | Solution Architect | ANALYSIS | RT-1, RT-4 | Complete design document with file structure, component hierarchy, data models | HIGH |
| RT-6 | Document scanner integration | Scanner Integration Analyst | ANALYSIS | RT-2 | Integration guide with code examples and troubleshooting steps | MEDIUM |

### Wave 3: Synthesis

| ID | Title | Assignee | Type | Dependencies | Acceptance Criteria | Effort |
|----|-------|----------|------|-------------|---------------------|--------|
| RT-7 | Synthesize improvement plan | Lead Synthesizer | SYNTHESIS | RT-1 to RT-6 | Complete synthesis with prioritized action items and roadmap | MEDIUM |

### Additional Tasks (Parallel with Wave 1)

| ID | Title | Assignee | Type | Dependencies | Acceptance Criteria | Effort |
|----|-------|----------|------|-------------|---------------------|--------|
| RT-8 | Inspect stock workflow | Workflow Mapper | RESEARCH | NONE | Stock workflow fully documented | LOW |
| RT-9 | Inspect borrow/withdraw workflow | Workflow Mapper | RESEARCH | NONE | Borrow and withdraw workflows documented | LOW |
| RT-10 | Inspect user/role/department workflow | Workflow Mapper | RESEARCH | NONE | User, role, and department workflows documented | LOW |

### Cross-Cutting Concerns

- **Citations**: All code references must include file path and line number (e.g., `scanner/page.tsx:45`)
- **Confidence levels**: Tag all findings as HIGH (verified), MEDIUM (inferred), LOW (speculative) with rationale
- **Contradictions**: When sources disagree, document both positions with evidence
- **Scope boundaries**: Stop investigating when information is sufficient to answer the sub-question

---

## Team Orchestration Guide

### Prerequisites

This research plan is designed for execution using Claude Code's experimental **agent teams** feature. Before executing:

1. Ensure agent teams is enabled (experimental feature)
2. Review the team composition and adjust if needed
3. Confirm the research question and scope

### Execution Steps

1. **Create team**: Use `TeamCreate` to spawn all 7 researchers defined in Team Composition
2. **Create shared tasks**: Use the shared task list to create all 10 tasks from the Research Tasks section
3. **Set dependencies**: Link tasks with their dependencies:
   - RT-5 depends on RT-1, RT-4
   - RT-6 depends on RT-2
   - RT-7 depends on RT-1, RT-2, RT-3, RT-4, RT-5, RT-6
4. **Monitor progress**: Use delegate mode or direct messaging to check on researcher progress
5. **Collect outputs**: Each researcher posts findings to their assigned tasks
6. **Run synthesis**: The Lead Synthesizer integrates all findings into the final report

### Display Mode

Use **delegate mode** for autonomous execution:
- Researchers work independently on their assigned tasks
- The lead researcher monitors progress and resolves blockers
- Use `SendMessage` to communicate between researchers when dependencies complete

### Communication Patterns

- **Handoff**: When a Wave 1 researcher completes, notify dependent Wave 2 researchers via task updates
- **Clarification**: Researchers can message the lead for scope questions
- **Contradiction**: If two researchers find conflicting information, escalate to lead for resolution

### Plan Approval

Before execution, review:
- [x] Team composition matches the research domain (CODEBASE, TECHNICAL, ARCHITECTURE)
- [x] Spawn prompts are detailed enough for autonomous execution
- [x] Task dependencies are correct
- [x] Acceptance criteria are measurable

---

## Acceptance Criteria

Research is complete when ALL of the following are met:

- [ ] Every sub-question (SQ-1 to SQ-7) has been investigated and answered
- [ ] Every research task (RT-1 to RT-10) has been completed and meets its acceptance criteria
- [ ] Findings are cited with sources (file:line) and confidence levels
- [ ] Contradictions are documented with both positions
- [ ] A synthesis document integrates all findings into a coherent improvement plan
- [ ] The original research question is directly answered with evidence:
  - Tag generator improvement design
  - Scanner fix recommendations
  - Complete workflow documentation

---

## Output Format: Final Report Structure

The final research report (produced during execution) should follow:

1. **Executive Summary** — Direct answer to the research question (2-3 paragraphs)
2. **Key Findings** — Bulleted list of major discoveries with confidence levels
3. **Current State Analysis**
   - Tag Generator Implementation
   - Scanner Implementation
   - Workflow Documentation
4. **Library Recommendations** — QR and Barcode library comparison and selection
5. **Proposed Design**
   - Tag Generator Architecture
   - Scanner Integration Approach
6. **Implementation Roadmap** — Phased plan with effort estimates
7. **Risk Assessment** — Potential issues and mitigations
8. **Appendix** — Detailed workflow documentation, code references, raw data
