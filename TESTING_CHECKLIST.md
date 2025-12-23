# 🧪 XSS Protection Testing Checklist

## 📋 **Pre-Testing Setup**

### **1. Install Test Dependencies**
```bash
npm install jsdom --save-dev
```

### **2. Run Automated Tests**
```bash
node scripts/test-xss-protection.js
```

---

## 🔍 **Manual Testing Steps**

### **Phase 1: Basic Functionality Tests**

#### **1.1 Show Creation & Editing**
- [ ] **Create a new show**
  - [ ] Add show name and time
  - [ ] Save show successfully
  - [ ] Verify show appears in dashboard

- [ ] **Edit show details**
  - [ ] Open existing show
  - [ ] Modify show information
  - [ ] Save changes successfully

#### **1.2 Lineup Item Management**
- [ ] **Add regular items**
  - [ ] Add interviewee with name and title
  - [ ] Add details with basic formatting (bold, italic)
  - [ ] Verify item displays correctly in lineup

- [ ] **Add notes**
  - [ ] Create note item
  - [ ] Use TipTap editor to add formatting
  - [ ] Verify note renders correctly in lineup
  - [ ] Verify note renders correctly in print preview

- [ ] **Add breaks**
  - [ ] Create break item
  - [ ] Verify break displays correctly

#### **1.3 HTML Content Testing**
- [ ] **Test valid HTML in show details**
  - [ ] Add `<strong>Bold text</strong>`
  - [ ] Add `<em>Italic text</em>`
  - [ ] Add `<ul><li>List item</li></ul>`
  - [ ] Verify formatting displays correctly

- [ ] **Test tables in show details**
  - [ ] Add `<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>`
  - [ ] Verify table displays correctly
  - [ ] Verify table prints correctly

### **Phase 2: XSS Protection Tests**

#### **2.1 Script Injection Tests**
- [ ] **Test script tags**
  - [ ] Try to add `<script>alert('xss')</script>` to show details
  - [ ] Verify script is stripped, only text content remains
  - [ ] Try to add `<script>alert('xss')</script>` to notes
  - [ ] Verify script is stripped

- [ ] **Test event handlers**
  - [ ] Try to add `<img src="x" onerror="alert('xss')" alt="test">`
  - [ ] Verify `onerror` attribute is stripped
  - [ ] Try to add `<div onclick="alert('xss')">Click me</div>`
  - [ ] Verify `onclick` attribute is stripped

- [ ] **Test iframe injection**
  - [ ] Try to add `<iframe src="javascript:alert('xss')"></iframe>`
  - [ ] Verify iframe is completely stripped

#### **2.2 Context-Specific Tests**
- [ ] **Email content restrictions**
  - [ ] Try to add table to email template
  - [ ] Verify table is stripped in email preview
  - [ ] Try to add complex HTML to email
  - [ ] Verify only basic formatting is allowed

- [ ] **Notes content**
  - [ ] Add code blocks with `<pre><code>`
  - [ ] Verify code blocks are preserved
  - [ ] Try to add external links
  - [ ] Verify links are handled appropriately

### **Phase 3: Display & Print Tests**

#### **3.1 Lineup Display**
- [ ] **Desktop view**
  - [ ] Verify all items display correctly
  - [ ] Verify formatting is preserved
  - [ ] Verify no broken HTML appears

- [ ] **Mobile view**
  - [ ] Switch to mobile layout
  - [ ] Verify items display correctly
  - [ ] Verify formatting is preserved

#### **3.2 Print Preview**
- [ ] **Generate print preview**
  - [ ] Open print preview for a show
  - [ ] Verify all content displays correctly
  - [ ] Verify formatting is preserved
  - [ ] Verify no broken HTML

- [ ] **Print functionality**
  - [ ] Test actual printing
  - [ ] Verify print output is correct

#### **3.3 Credits System**
- [ ] **Producer credits**
  - [ ] Add producer credits to show
  - [ ] Verify credits display correctly
  - [ ] Verify formatting is preserved

- [ ] **Digital credits**
  - [ ] Add digital credits
  - [ ] Verify credits display correctly

- [ ] **Next show credits**
  - [ ] Add next show information
  - [ ] Verify credits display correctly

### **Phase 4: Admin Functions**

#### **4.1 Email System**
- [ ] **Email templates**
  - [ ] Edit email template
  - [ ] Add HTML formatting
  - [ ] Generate email preview
  - [ ] Verify preview is sanitized correctly

- [ ] **Email sending**
  - [ ] Send test email
  - [ ] Verify email content is safe

#### **4.2 Dashboard**
- [ ] **Lineup cards**
  - [ ] View dashboard
  - [ ] Verify lineup cards display correctly
  - [ ] Verify notes are sanitized

- [ ] **Backup lineups**
  - [ ] View backup lineup cards
  - [ ] Verify content is sanitized

### **Phase 5: Performance Tests**

#### **5.1 Loading Performance**
- [ ] **Page load times**
  - [ ] Measure page load time before changes
  - [ ] Measure page load time after changes
  - [ ] Verify no significant performance impact

- [ ] **Editor performance**
  - [ ] Test TipTap editor responsiveness
  - [ ] Verify no lag when typing
  - [ ] Verify no lag when formatting

#### **5.2 Memory Usage**
- [ ] **Monitor memory usage**
  - [ ] Check memory usage during normal operation
  - [ ] Verify no memory leaks
  - [ ] Verify DOMPurify doesn't cause issues

---

## 🚨 **Error Testing**

### **6.1 Error Handling**
- [ ] **Invalid HTML**
  - [ ] Try to save malformed HTML
  - [ ] Verify system handles gracefully
  - [ ] Verify no errors in console

- [ ] **Empty content**
  - [ ] Try to save empty content
  - [ ] Verify system handles gracefully

- [ ] **Very long content**
  - [ ] Try to save very long HTML content
  - [ ] Verify system handles gracefully

### **6.2 Edge Cases**
- [ ] **Special characters**
  - [ ] Test with Hebrew text
  - [ ] Test with special symbols
  - [ ] Test with emojis

- [ ] **Mixed content**
  - [ ] Test with mix of safe and unsafe HTML
  - [ ] Verify only unsafe parts are stripped

---

## ✅ **Success Criteria**

### **Functionality Preserved**
- [ ] All existing features work as before
- [ ] No broken displays or layouts
- [ ] All user interactions work correctly
- [ ] Print functionality works correctly

### **Security Enhanced**
- [ ] Script tags are stripped
- [ ] Event handlers are removed
- [ ] Dangerous elements are blocked
- [ ] Context-appropriate restrictions applied

### **Performance Maintained**
- [ ] No significant performance degradation
- [ ] Page load times remain acceptable
- [ ] Editor responsiveness maintained
- [ ] No memory leaks

---

## 📝 **Test Results Log**

### **Date: ___________**
### **Tester: ___________**

| Test Category | Status | Notes |
|---------------|--------|-------|
| Basic Functionality | ⭕ | |
| XSS Protection | ⭕ | |
| Display & Print | ⭕ | |
| Admin Functions | ⭕ | |
| Performance | ⭕ | |
| Error Handling | ⭕ | |

### **Issues Found:**
1. 
2. 
3. 

### **Recommendations:**
1. 
2. 
3. 

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue: Content not displaying**
- **Check**: Browser console for errors
- **Solution**: Verify sanitization function is imported correctly

#### **Issue: Formatting lost**
- **Check**: DOMPurify configuration
- **Solution**: Verify allowed tags/attributes are correct

#### **Issue: Performance problems**
- **Check**: Network tab for slow requests
- **Solution**: Verify DOMPurify is not being called excessively

#### **Issue: Print not working**
- **Check**: Print preview content
- **Solution**: Verify sanitization is applied to print content

---

## 📞 **Support**

If you encounter issues during testing:
1. Check browser console for errors
2. Verify all imports are correct
3. Test with simple content first
4. Contact development team if issues persist
