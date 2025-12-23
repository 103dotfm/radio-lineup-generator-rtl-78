#!/bin/bash

echo "🔧 Configuring Postfix to use submission port (587) to bypass ISP blocking..."

# Backup current configuration
echo "📋 Backing up current configuration..."
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)

# Update configuration to use submission port
echo "📝 Updating configuration for submission port..."
sudo cp postfix-submission-config.txt /etc/postfix/main.cf

# Create TLS policy file for submission port
echo "🔐 Creating TLS policy for submission port..."
sudo tee /etc/postfix/tls_policy > /dev/null << 'EOF'
# Use submission port (587) for external domains
gmail.com may
google.com may
outlook.com may
hotmail.com may
yahoo.com may
aol.com may
icloud.com may
protonmail.com may
tutanota.com may
* may
EOF

# Create the hash file
echo "📋 Creating TLS policy hash file..."
sudo postmap /etc/postfix/tls_policy

# Clear mail queue
echo "🧹 Clearing mail queue..."
sudo postqueue -f

# Reload Postfix
echo "🔄 Reloading Postfix..."
sudo systemctl reload postfix

# Test connectivity to submission port
echo "🌐 Testing connectivity to submission port (587)..."
echo "Testing Gmail submission port:"
timeout 10 telnet smtp.gmail.com 587 || echo "Connection failed"

echo "Testing Outlook submission port:"
timeout 10 telnet smtp.office365.com 587 || echo "Connection failed"

echo "✅ Postfix configured for submission port!"
echo ""
echo "📧 Next steps:"
echo "1. Try sending a test email from the admin panel"
echo "2. Monitor logs with: sudo tail -f /var/log/mail.log"
echo "3. Check mail queue with: sudo mailq"
echo ""
echo "🔍 The submission port (587) is usually not blocked by ISPs."
echo "If this still doesn't work, you may need to contact your ISP." 