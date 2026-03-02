# Accessibility Guide

## Overview
This document outlines accessibility improvements made to the Rhent application to ensure it's usable by everyone, including users with disabilities.

---

## WCAG Compliance Goals

We aim to meet **WCAG 2.1 Level AA** standards, which includes:

- **Perceivable**: Information must be presentable to users in ways they can perceive
- **Operable**: Interface components must be operable
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough for various assistive technologies

---

## Improvements Made

### 1. ARIA Labels and Roles

#### Buttons
- All icon-only buttons now have `aria-label` attributes
- Buttons with loading states include `aria-busy="true"`
- Disabled buttons properly communicate their state

#### Forms
- All form inputs have associated labels using `htmlFor`/`id` attributes
- Required fields are marked with `aria-required="true"`
- Form validation errors use `aria-invalid` and `aria-describedby`
- Form sections use `aria-labelledby` for grouping

#### Dialogs
- Dialogs use proper `role="dialog"` and `aria-modal="true"`
- Dialog titles use `aria-labelledby`
- Dialog descriptions use `aria-describedby`
- Focus is properly trapped within dialogs

#### Navigation
- Navigation landmarks use proper ARIA roles (`navigation`, `main`, `complementary`)
- Skip links for keyboard navigation
- Breadcrumbs use `aria-label` and `aria-current`

### 2. Keyboard Navigation

#### Focus Management
- All interactive elements are keyboard accessible
- Focus indicators are visible (using `focus-visible` styles)
- Tab order follows logical flow
- Focus is trapped in modals/dialogs
- Focus returns to trigger element when dialogs close

#### Keyboard Shortcuts
- `Esc` closes dialogs and modals
- `Enter` submits forms and activates buttons
- `Tab` navigates through interactive elements
- `Shift+Tab` navigates backwards
- Arrow keys navigate within appropriate components (selects, calendars)

### 3. Screen Reader Support

#### Semantic HTML
- Proper use of semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`)
- Headings follow proper hierarchy (h1 → h2 → h3)
- Lists use proper list elements (`<ul>`, `<ol>`)

#### Live Regions
- Dynamic content updates use `aria-live` regions
- Loading states announce to screen readers
- Error messages are announced immediately

### 4. Visual Accessibility

#### Color Contrast
- Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Interactive elements have sufficient contrast
- Color is not the only means of conveying information

#### Focus Indicators
- Clear, visible focus indicators on all interactive elements
- Focus rings are at least 2px wide
- Focus indicators have sufficient contrast

---

## Implementation Checklist

### Forms
- [x] All inputs have associated labels
- [x] Required fields are marked
- [x] Validation errors are announced
- [x] Form sections are properly grouped

### Buttons
- [x] Icon-only buttons have aria-labels
- [x] Loading states are announced
- [x] Disabled states are communicated

### Dialogs
- [x] Proper ARIA attributes
- [x] Focus trapping
- [x] Focus return on close
- [x] Escape key closes

### Navigation
- [x] Logical tab order
- [x] Skip links (where applicable)
- [x] Proper landmarks

### Content
- [x] Semantic HTML
- [x] Proper heading hierarchy
- [x] Alt text for images (where applicable)
- [x] Descriptive link text

---

## Testing

### Automated Testing
- Use tools like:
  - **axe DevTools** browser extension
  - **WAVE** browser extension
  - **Lighthouse** accessibility audit

### Manual Testing
- **Keyboard Navigation**: Test entire app using only keyboard
- **Screen Reader**: Test with:
  - NVDA (Windows)
  - JAWS (Windows)
  - VoiceOver (macOS/iOS)
  - TalkBack (Android)

### Browser Testing
- Test in multiple browsers:
  - Chrome/Edge
  - Firefox
  - Safari

---

## Common Patterns

### Icon-Only Buttons
```tsx
<Button aria-label="Close dialog" onClick={onClose}>
  <X className="w-4 h-4" />
</Button>
```

### Loading States
```tsx
<Button aria-busy={loading} aria-label={loading ? "Processing..." : "Submit"}>
  {loading ? <Loader2 className="animate-spin" /> : "Submit"}
</Button>
```

### Form Validation
```tsx
<Input
  id="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert" className="text-destructive">
    Please enter a valid email
  </span>
)}
```

### Dialog
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <DialogTitle id="dialog-title">Title</DialogTitle>
    <DialogDescription id="dialog-description">Description</DialogDescription>
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

## Future Improvements

- [ ] Add skip links for main content
- [ ] Implement keyboard shortcuts documentation
- [ ] Add high contrast mode support
- [ ] Improve mobile accessibility
- [ ] Add reduced motion support

---

## Notes

- Accessibility is an ongoing process, not a one-time task
- Regular audits should be performed
- User feedback is valuable for identifying issues
- Keep up with WCAG updates and best practices
