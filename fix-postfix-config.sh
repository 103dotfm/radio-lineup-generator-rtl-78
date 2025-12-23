#!/bin/bash

echo "🔧 Fixing Postfix configuration for internal server email..."

# Backup current configuration
echo "📋 Backing up current configuration..."
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)

# Create clean configuration
echo "📝 Creating clean configuration..."
sudo cp postfix-main-cf-clean.txt /etc/postfix/main.cf

# Create mail log file if it doesn't exist
echo "📊 Setting up mail logging..."
sudo touch /var/log/mail.log
sudo chown syslog:adm /var/log/mail.log
sudo chmod 644 /var/log/mail.log

# Configure rsyslog to log mail messages
echo "📋 Configuring rsyslog for mail logging..."
if ! grep -q "mail.*" /etc/rsyslog.conf; then
    echo "# Mail logging" | sudo tee -a /etc/rsyslog.conf
    echo "mail.*                          -/var/log/mail.log" | sudo tee -a /etc/rsyslog.conf
fi

# Restart rsyslog to pick up changes
echo "🔄 Restarting rsyslog..."
sudo systemctl restart rsyslog

# Clear mail queue
echo "🧹 Clearing mail queue..."
sudo postqueue -f

# Reload Postfix
echo "🔄 Reloading Postfix..."
sudo systemctl reload postfix

# Test DNS resolution
echo "🌐 Testing DNS resolution..."
echo "Testing gmail.com:"
nslookup gmail.com
echo "Testing outlook.com:"
nslookup outlook.com

# Test network connectivity
echo "🌐 Testing network connectivity..."
echo "Testing connection to Gmail SMTP:"
timeout 10 telnet gmail-smtp-in.l.google.com 25 || echo "Connection failed (this is normal if port 25 is blocked)"

echo "✅ Postfix configuration fixed!"
echo ""
echo "📧 Next steps:"
echo "1. Try sending a test email from the admin panel"
echo "2. Monitor logs with: sudo tail -f /var/log/mail.log"
echo "3. Check mail queue with: sudo mailq"
echo ""
echo "🔍 If emails still don't deliver, check the logs for specific error messages." 