#!/bin/bash

echo "🔧 Fixing TLS policy for Postfix..."

# Copy the TLS policy file
echo "📋 Copying TLS policy file..."
sudo cp tls_policy /etc/postfix/tls_policy

# Create the database file
echo "📋 Creating TLS policy database..."
sudo postmap /etc/postfix/tls_policy

# Check if files were created
echo "📋 Checking files..."
ls -la /etc/postfix/tls_policy*

# Reload Postfix
echo "🔄 Reloading Postfix..."
sudo systemctl reload postfix

# Clear mail queue
echo "🧹 Clearing mail queue..."
sudo postqueue -f

echo "✅ TLS policy fixed!"
echo ""
echo "📧 Next steps:"
echo "1. Try sending a test email from the admin panel"
echo "2. Monitor logs with: sudo tail -f /var/log/mail.log" 