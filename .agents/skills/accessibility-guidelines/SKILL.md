---
name: Accessibility Guidelines
description: แนวทางการออกแบบ UI ที่เข้าถึงได้สำหรับผู้ใช้ทุกกลุ่ม (WCAG, ARIA, Semantic HTML)
---

# แนวทางการเข้าถึง (Accessibility Guidelines)

คู่มือนี้ช่วยให้คุณสร้าง UI ที่เข้าถึงได้สำหรับผู้ใช้ทุกกลุ่ม รวมถึงผู้พิการ

## หลักการ WCAG 2.1

### 4 หลักการหลัก (POUR)

1. **Perceivable (รับรู้ได้)** - ข้อมูลต้องแสดงในรูปแบบที่ผู้ใช้รับรู้ได้
2. **Operable (ใช้งานได้)** - UI ต้องใช้งานได้ด้วยคีย์บอร์ด
3. **Understandable (เข้าใจได้)** - เนื้อหาต้องชัดเจนและคาดเดาได้
4. **Robust (แข็งแกร่ง)** - ใช้งานได้กับเทคโนโลยีช่วยเหลือ

## Semantic HTML

### ใช้ Element ที่ถูกต้อง

```html
<!-- ✅ ถูกต้อง -->
<button onClick={handleClick}>กดที่นี่</button>
<a href="/page">ไปหน้าถัดไป</a>
<nav>เมนูหลัก</nav>
<main>เนื้อหาหลัก</main>
<article>บทความ</article>
<aside>เนื้อหาเสริม</aside>

<!-- ❌ ไม่ถูกต้อง -->
<div onClick={handleClick}>กดที่นี่</div>
<span onClick={goToPage}>ไปหน้าถัดไป</span>
```

### โครงสร้าง Heading

```html
<!-- ✅ ลำดับถูกต้อง -->
<h1>หน้าหลัก</h1>
  <h2>ส่วนที่ 1</h2>
    <h3>หัวข้อย่อย</h3>
  <h2>ส่วนที่ 2</h2>

<!-- ❌ ข้าม Level -->
<h1>หน้าหลัก</h1>
  <h3>ส่วนที่ 1</h3>  <!-- ข้าม h2 -->
```

## ARIA Attributes

### Labels และ Descriptions

```tsx
// ปุ่มที่มีเฉพาะ Icon
<button aria-label="ปิดหน้าต่าง">
  <X className="h-4 w-4" />
</button>

// Input ที่ซ่อน Label
<input 
  type="search" 
  aria-label="ค้นหาสินค้า" 
  placeholder="ค้นหา..."
/>

// ลิงก์ไปภายนอก
<a 
  href="https://external.com" 
  target="_blank"
  aria-label="เปิดเว็บไซต์ภายนอก (เปิดในแท็บใหม่)"
>
  ลิงก์
</a>
```

### Live Regions

```tsx
// แจ้งเตือนที่อ่านโดย Screen Reader
<div role="alert" aria-live="polite">
  บันทึกสำเร็จ
</div>

// แจ้งเตือนด่วน
<div role="alert" aria-live="assertive">
  เกิดข้อผิดพลาด!
</div>
```

### การซ่อนจาก Screen Reader

```tsx
// ซ่อนจาก Screen Reader (Icon ที่มี Label แล้ว)
<button aria-label="ลบ">
  <Trash aria-hidden="true" />
  ลบรายการ
</button>

// เนื้อหาสำหรับ Screen Reader เท่านั้น
<span className="sr-only">เปิดเมนู</span>
```

## การใช้งานคีย์บอร์ด

### Focus Management

```tsx
// Focus trap ใน Modal
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

### Skip Links

```tsx
// ลิงก์ข้ามไปเนื้อหาหลัก
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white p-2"
>
  ข้ามไปเนื้อหาหลัก
</a>

<main id="main-content" tabIndex={-1}>
  <!-- เนื้อหาหลัก -->
</main>
```

## สี และ Contrast

### Contrast Ratio

- **ข้อความปกติ**: อย่างน้อย 4.5:1
- **ข้อความใหญ่ (18px+)**: อย่างน้อย 3:1
- **UI Components**: อย่างน้อย 3:1

```css
/* ✅ Contrast ดี */
.text-primary {
  color: #1e40af; /* บน background สีขาว */
}

/* ❌ Contrast ไม่ดี */
.text-light-gray {
  color: #d1d5db; /* บน background สีขาว - อ่านยาก */
}
```

### อย่าใช้สีเพียงอย่างเดียว

```tsx
// ✅ ใช้สี + Icon + ข้อความ
<div className="text-red-500">
  <AlertCircle className="inline mr-2" />
  เกิดข้อผิดพลาด: กรุณากรอกข้อมูลให้ครบ
</div>

// ✅ Input Error
<input 
  className="border-red-500" 
  aria-invalid="true"
  aria-describedby="error-message"
/>
<p id="error-message" className="text-red-500">
  กรุณากรอกอีเมลให้ถูกต้อง
</p>
```

## Forms

### Labels และ Error Messages

```tsx
<div>
  <label htmlFor="email">อีเมล</label>
  <input 
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={errors.email ? "true" : "false"}
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && (
    <p id="email-error" role="alert" className="text-red-500">
      {errors.email.message}
    </p>
  )}
</div>
```

### Fieldsets และ Legends

```tsx
<fieldset>
  <legend>ที่อยู่จัดส่ง</legend>
  
  <label htmlFor="address">ที่อยู่</label>
  <input id="address" />
  
  <label htmlFor="city">เมือง</label>
  <input id="city" />
</fieldset>
```

## Tables

```tsx
<table>
  <caption>รายการสินค้าคงคลัง</caption>
  <thead>
    <tr>
      <th scope="col">รหัส</th>
      <th scope="col">ชื่อสินค้า</th>
      <th scope="col">จำนวน</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>001</td>
      <td>คอมพิวเตอร์</td>
      <td>10</td>
    </tr>
  </tbody>
</table>
```

## Images

```tsx
// รูปที่มีเนื้อหาสำคัญ
<img 
  src="/chart.png" 
  alt="กราฟแสดงยอดขายปี 2024 เพิ่มขึ้น 20% จากปีก่อน"
/>

// รูปประดับ
<img src="/decoration.png" alt="" role="presentation" />

// รูปพร้อม Caption
<figure>
  <img src="/product.jpg" alt="iPhone 15 Pro Max สีดำ" />
  <figcaption>iPhone 15 Pro Max ราคา 59,900 บาท</figcaption>
</figure>
```

## Shadcn UI + Radix

Shadcn UI ใช้ Radix UI ซึ่งมี Accessibility ในตัว:

```tsx
// Dialog มี focus trap และ ARIA ในตัว
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

<Dialog>
  <DialogContent>
    <DialogTitle>หัวข้อ</DialogTitle>
    <!-- เนื้อหา -->
  </DialogContent>
</Dialog>

// Select มี keyboard navigation ในตัว
import { Select, SelectContent, SelectItem } from '@/components/ui/select';

<Select>
  <SelectContent>
    <SelectItem value="1">ตัวเลือก 1</SelectItem>
    <SelectItem value="2">ตัวเลือก 2</SelectItem>
  </SelectContent>
</Select>
```

## การทดสอบ

### เครื่องมือทดสอบ

1. **Lighthouse** - Chrome DevTools → Lighthouse → Accessibility
2. **axe DevTools** - Extension สำหรับ Chrome/Firefox
3. **WAVE** - Web Accessibility Evaluation Tool
4. **Screen Reader** - NVDA, VoiceOver, JAWS

### Checklist การทดสอบ

- [ ] ใช้งานได้ด้วยคีย์บอร์ดเท่านั้น
- [ ] Tab order เป็นลำดับที่สมเหตุสมผล
- [ ] Focus indicator ชัดเจน
- [ ] ข้อความอ่านได้ด้วย Screen Reader
- [ ] Contrast ratio ผ่านเกณฑ์
- [ ] ไม่มี auto-play video/audio
- [ ] Form errors ชัดเจน
- [ ] รูปภาพมี alt text

## TailwindCSS Utilities

```css
/* ซ่อนจาก Visual แต่อ่านได้ด้วย Screen Reader */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* แสดงเมื่อ Focus */
.focus:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ ใช้ Semantic HTML เสมอ
2. ✅ ทุก interactive element ต้อง focus ได้
3. ✅ ใช้ ARIA เมื่อจำเป็นเท่านั้น
4. ✅ ทดสอบด้วย Screen Reader
5. ✅ ตรวจสอบ Contrast ratio
6. ✅ รองรับ Keyboard navigation
7. ✅ ใช้ Skip links
8. ❌ อย่าใช้ `tabindex > 0`
9. ❌ อย่าซ่อน focus indicator
10. ❌ อย่าใช้สีเพียงอย่างเดียวในการสื่อความหมาย

## อ้างอิงอย่างรวดเร็ว

| Element | ARIA Role | หมายเหตุ |
|---------|-----------|----------|
| `<button>` | button | ใช้สำหรับ action |
| `<a href>` | link | ใช้สำหรับ navigation |
| `<nav>` | navigation | เมนูหลัก |
| `<main>` | main | เนื้อหาหลัก |
| `<article>` | article | เนื้อหาอิสระ |
| `<aside>` | complementary | เนื้อหาเสริม |
| `<form>` | form | แบบฟอร์ม |
| `<table>` | table | ตารางข้อมูล |
