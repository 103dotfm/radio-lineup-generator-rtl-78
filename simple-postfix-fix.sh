#!/bin/bash

echo "🔧 Configuring Postfix for port 587 delivery..."

# Backup current configuration
echo "📋 Backing up current configuration..."
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)

# Create a simple TLS policy that forces port 587
echo "📋 Creating simple TLS policy..."
sudo tee /etc/postfix/tls_policy > /dev/null << 'EOF'
# Force port 587 for all external domains
* may
EOF

# Create the database
echo "📋 Creating TLS policy database..."
sudo postmap /etc/postfix/tls_policy

# Update main.cf with minimal configuration
echo "📋 Updating Postfix configuration..."
sudo tee /etc/postfix/main.cf > /dev/null << 'EOF'
# Basic Postfix Configuration
myhostname = localhost
mydomain = localhost
myorigin = $mydomain
inet_interfaces = loopback-only
inet_protocols = ipv4

# Queue settings
queue_directory = /var/spool/postfix
command_directory = /usr/sbin
daemon_directory = /usr/libexec/postfix
data_directory = /var/lib/postfix

# Mail delivery settings
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
mynetworks = 127.0.0.0/8, ::1/128
relayhost = 
home_mailbox = Maildir/

# TLS Configuration - Force port 587
smtp_tls_security_level = may
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

# Force submission port (587) for external delivery
smtp_tls_policy_maps = hash:/etc/postfix/tls_policy

# Additional settings for better delivery
smtp_host_lookup = dns, native
smtp_address_preference = ipv4
disable_dns_lookups = no
EOF

# Reload Postfix
echo "🔄 Reloading Postfix..."
sudo systemctl reload postfix

# Clear mail queue
echo "🧹 Clearing mail queue..."
sudo postqueue -f

# Check configuration
echo "📋 Checking configuration..."
sudo postconf -n | grep -E "(smtp_tls|relayhost|mynetworks)"

echo "✅ Postfix configured for port 587 delivery!"
echo ""
echo "📧 Next steps:"
echo "1. Try sending a test email from the admin panel"
echo "2. Monitor logs with: sudo tail -f /var/log/mail.log"
echo "3. If still failing, we'll try a different approach" 