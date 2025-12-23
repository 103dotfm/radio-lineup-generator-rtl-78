# Internal Server Email Setup

This document explains how to set up and use the new internal server email functionality in the Radio Lineup Generator.

## Overview

The internal server email option allows you to send emails using your server's own SMTP service instead of external services like Mailgun or Gmail. This provides:

- **Cost savings**: No external email service fees
- **Full control**: Complete control over email delivery
- **Privacy**: Emails don't pass through third-party services
- **Reliability**: No dependency on external service availability

## Prerequisites

### 1. SMTP Server Installation

Your server needs an SMTP service running on localhost. Common options include:

#### Option A: Postfix (Recommended for Ubuntu/Debian)
```bash
# Install Postfix
sudo apt update
sudo apt install postfix

# During installation, choose "Internet Site" when prompted
# Configure for local delivery only
```

#### Option B: Exim (Alternative)
```bash
# Install Exim
sudo apt update
sudo apt install exim4

# Configure for local delivery
sudo dpkg-reconfigure exim4-config
```

### 2. Firewall Configuration

Ensure port 25 is open for SMTP:
```bash
# Check if port 25 is open
sudo netstat -tlnp | grep :25

# If using UFW firewall
sudo ufw allow 25
```

## Configuration

### 1. Database Migration

Run the migration to add the missing `is_eu_region` field:
```bash
# Connect to your database and run:
psql -d your_database_name -f migrations/add_is_eu_region_to_email_settings.sql
```

### 2. Admin Panel Configuration

1. Go to the Admin Panel → Email Settings
2. Select "שרת פנימי (שימוש במשאבי השרת)" from the email method options
3. Configure the sender information:
   - **Sender Email**: Your email address
   - **Sender Name**: Your name or organization name
4. Save the settings

### 3. Email Templates

Configure your email templates as usual:
- **Subject Template**: e.g., "ליינאפ תוכנית {{show_name}}"
- **Body Template**: Your HTML email template with placeholders

## Testing

### 1. Test Internal Server SMTP

Run the test script to verify your SMTP setup:
```bash
node test-internal-email.js
```

### 2. Test from Admin Panel

1. Go to Email Settings → Recipients tab
2. Add a test email address
3. Click "שלח דואר אלקטרוני לדוגמה"
4. Check if the email is received

## Troubleshooting

### Common Issues

#### 1. Connection Refused (ECONNREFUSED)
**Problem**: SMTP service not running
**Solution**: 
```bash
# Check if Postfix is running
sudo systemctl status postfix

# Start Postfix if not running
sudo systemctl start postfix
sudo systemctl enable postfix
```

#### 2. Authentication Required
**Problem**: SMTP requires authentication
**Solution**: Configure your SMTP server for local delivery without authentication:
```bash
# For Postfix, edit /etc/postfix/main.cf
sudo nano /etc/postfix/main.cf

# Add or modify:
inet_interfaces = localhost
mynetworks = 127.0.0.0/8
```

#### 3. Emails Not Delivered
**Problem**: Emails sent but not received
**Solution**: 
- Check server logs: `sudo tail -f /var/log/mail.log`
- Verify DNS records (MX, SPF, DKIM)
- Check if emails are in spam folder

### Logs and Monitoring

#### Postfix Logs
```bash
# View mail logs
sudo tail -f /var/log/mail.log

# Check mail queue
sudo mailq

# Flush mail queue if needed
sudo postqueue -f
```

#### Application Logs
Check your application logs for email-related errors:
```bash
# If using PM2
pm2 logs

# If using systemd
sudo journalctl -u your-app-service -f
```

## Security Considerations

### 1. Rate Limiting
Configure your SMTP server to prevent abuse:
```bash
# For Postfix, add to main.cf:
smtpd_client_restrictions = permit_mynetworks, reject
smtpd_helo_restrictions = permit_mynetworks, reject_invalid_helo_hostname
```

### 2. Spam Prevention
- Configure SPF, DKIM, and DMARC records
- Use proper reverse DNS
- Monitor for abuse

### 3. Firewall Rules
- Only allow SMTP from localhost
- Block external access to port 25 if not needed

## Performance Optimization

### 1. Connection Pooling
The application uses connection pooling for better performance.

### 2. Queue Management
Monitor and manage the mail queue:
```bash
# Check queue size
sudo mailq | wc -l

# Process queue
sudo postqueue -f
```

## Migration from External Services

### From Mailgun
1. Update email method to "internal_server"
2. Remove Mailgun API key and domain
3. Test email delivery
4. Monitor for any delivery issues

### From Gmail API
1. Update email method to "internal_server"
2. Remove Gmail OAuth credentials
3. Test email delivery
4. Update any email templates if needed

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test SMTP connectivity manually
4. Verify DNS configuration
5. Contact system administrator if needed

## Files Modified

The following files were added or modified to support internal server email:

- `src/components/admin/EmailSettings.tsx` - Added internal server option
- `server/routes/email.js` - Added internal server email handling
- `supabase/functions/send-lineup-email/index.ts` - Added internal server support
- `supabase/functions/send-lineup-email/internal-server-sender.ts` - New internal server sender
- `supabase/functions/send-lineup-email/utils.ts` - Updated types and validation
- `database/schema.sql` - Added is_eu_region field
- `migrations/add_is_eu_region_to_email_settings.sql` - Database migration
- `test-internal-email.js` - Test script 

## 🎯 **Solution: Configure Postfix to Use Port 587**

The logs clearly show that port 25 is blocked by your ISP. Let's configure Postfix to use port 587 (submission port) instead, which is usually not blocked.

### **Manual Steps to Run:**

**Step 1: Update Postfix configuration**
```bash
# Backup current config
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup

# Update with submission port configuration
sudo cp postfix-submission-config.txt /etc/postfix/main.cf
```

**Step 2: Create TLS policy for submission port**
```bash
<code_block_to_apply_changes_from>
```

**Step 3: Clear queue and reload**
```bash
# Clear current mail queue
sudo postqueue -f

# Reload Postfix
sudo systemctl reload postfix
```

**Step 4: Test connectivity**
```bash
# Test submission port connectivity
telnet smtp.gmail.com 587
telnet smtp.office365.com 587
```

**Step 5: Test email delivery**
1. Go to your admin panel
2. Send a test email
3. Monitor logs: `sudo tail -f /var/log/mail.log`

### **What This Does:**

- ✅ **Bypasses ISP blocking** - Uses port 587 instead of port 25
- ✅ **Enables TLS encryption** - Required for submission port
- ✅ **Maintains internal server** - Still uses your server's resources
- ✅ **Improves deliverability** - Submission port is more reliable

### **Expected Results:**

After this configuration, you should see in the logs:
- Connection attempts to port 587 instead of port 25
- TLS handshakes with external mail servers
- Successful email delivery

The submission port (587) is specifically designed for this purpose and is rarely blocked by ISPs. This should solve your email delivery issue while keeping everything internal to your server! 🚀

Try these steps and let me know what you see in the logs! 