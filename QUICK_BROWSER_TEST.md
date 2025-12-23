# 🚀 Quick Browser Testing Guide

## ⚡ **5-Minute Quick Test**

### **Step 1: Test Basic Functionality**
1. **Open your website** (http://192.168.10.121/ or http://l.103.fm:8080/)
2. **Login as admin**
3. **Create a new show** or open an existing one
4. **Add a regular item** with basic details
5. **Verify it displays correctly** ✅

### **Step 2: Test HTML Formatting**
1. **Edit the item details**
2. **Add this HTML content:**
   ```html
   <strong>Bold text</strong> and <em>italic text</em>
   <ul><li>List item 1</li><li>List item 2</li></ul>
   ```
3. **Save and verify formatting displays correctly** ✅

### **Step 3: Test XSS Protection**
1. **Edit the item details again**
2. **Try to add this malicious content:**
   ```html
   <script>alert('XSS Test')</script>
   <img src="x" onerror="alert('XSS Test')" alt="test">
   <iframe src="javascript:alert('XSS Test')"></iframe>
   ```
3. **Save and verify:**
   - No JavaScript alerts appear ✅
   - Only text content is displayed ✅
   - No broken HTML appears ✅

### **Step 4: Test Notes**
1. **Add a note item**
2. **Use the TipTap editor to add formatting**
3. **Verify note displays correctly in lineup** ✅
4. **Open print preview and verify note renders correctly** ✅

### **Step 5: Test Print Preview**
1. **Open print preview**
2. **Verify all content displays correctly** ✅
3. **Verify formatting is preserved** ✅
4. **Verify no broken HTML** ✅

---

## 🔍 **Detailed Testing Scenarios**

### **Scenario A: Show Details with Tables**
1. **Add this content to show details:**
   ```html
   <table border="1">
     <tr><td>Name</td><td>Phone</td></tr>
     <tr><td>John Doe</td><td>123-456-7890</td></tr>
   </table>
   ```
2. **Verify table displays correctly** ✅
3. **Verify table prints correctly** ✅

### **Scenario B: Notes with Code**
1. **Add a note with this content:**
   ```html
   <pre><code>console.log("Hello World");</code></pre>
   ```
2. **Verify code block displays correctly** ✅

### **Scenario C: Email Template**
1. **Go to Admin → Email Settings**
2. **Edit email template**
3. **Add HTML formatting**
4. **Generate preview**
5. **Verify content is sanitized appropriately** ✅

---

## 🚨 **What to Look For**

### **✅ Success Indicators**
- All content displays correctly
- Formatting is preserved
- No JavaScript alerts from malicious content
- No broken HTML or layout issues
- Print preview works correctly
- No console errors

### **❌ Failure Indicators**
- Content not displaying
- Formatting lost
- JavaScript alerts appearing
- Broken HTML or layout
- Console errors
- Performance issues

---

## 🔧 **Quick Fixes**

### **If content doesn't display:**
1. Check browser console for errors
2. Verify the page loaded completely
3. Try refreshing the page

### **If formatting is lost:**
1. Check if DOMPurify is working correctly
2. Verify the sanitization function is imported
3. Check the allowed tags configuration

### **If you see JavaScript alerts:**
1. The XSS protection is not working
2. Check if DOMPurify is installed correctly
3. Verify the sanitization is being applied

---

## 📞 **Need Help?**

If you encounter issues:
1. **Check browser console** (F12 → Console tab)
2. **Look for error messages**
3. **Try with simple content first**
4. **Contact the development team**

---

## 🎯 **Test Results**

| Test | Status | Notes |
|------|--------|-------|
| Basic Functionality | ⭕ | |
| HTML Formatting | ⭕ | |
| XSS Protection | ⭕ | |
| Notes System | ⭕ | |
| Print Preview | ⭕ | |
| Email Templates | ⭕ | |

**Overall Status: ⭕ PASS / ⭕ FAIL**
