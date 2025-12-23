# SSL Certificate Installation Guide

## CA-Signed Certificate for l.103.fm

The website now uses a certificate signed by a local Certificate Authority (CA). This approach provides better security and easier certificate management.

### Certificate Details
- **Domain**: l.103.fm
- **Valid Until**: 10 years from creation
- **Security**: 4096-bit RSA key with SHA256
- **Protocols**: TLS 1.2 and TLS 1.3 only
- **Ciphers**: Modern, secure cipher suites
- **Signed By**: 103FM Development CA

### How to Install the Certificate

#### Step 1: Install the CA Certificate (Required)
1. Download the CA certificate: https://l.103.fm:8080/ca-certificate
2. Install it as a trusted root certificate in your browser/system
3. This is a one-time setup - once installed, all certificates signed by this CA will be trusted

#### Step 2: Install the Domain Certificate (Optional)
1. Download the domain certificate: https://l.103.fm:8080/certificate
2. Install it as a trusted certificate in your browser/system

### Browser-Specific Installation Instructions

#### Chrome/Edge:
1. Go to `chrome://settings/certificates`
2. Click "Import" under "Authorities"
3. Select the downloaded CA certificate (`103fm-ca.crt`)
4. Check "Trust this certificate for identifying websites"
5. Click "OK"
6. Restart your browser

#### Firefox:
1. Go to `about:preferences#privacy`
2. Click "View Certificates"
3. Go to "Authorities" tab
4. Click "Import"
5. Select the CA certificate and check "Trust this CA to identify websites"
6. Restart your browser

#### Safari (macOS):
1. Open Keychain Access
2. Import the CA certificate (`103fm-ca.crt`)
3. Double-click the certificate
4. Expand "Trust" and set "When using this certificate" to "Always Trust"
5. Restart Safari

#### Windows (System-wide):
1. Double-click the CA certificate file
2. Click "Install Certificate"
3. Choose "Local Machine" and "Place all certificates in the following store"
4. Click "Browse" and select "Trusted Root Certification Authorities"
5. Click "OK" and "Yes" to confirm
6. Restart your browser

### Security Features Implemented

✅ **CA-Signed Certificate**
- Certificate signed by trusted local CA
- Proper certificate chain
- Extended validity (10 years)

✅ **Modern SSL Configuration**
- TLS 1.2 and TLS 1.3 protocols
- Strong cipher suites
- Perfect Forward Secrecy (PFS)

✅ **Enhanced Security Headers**
- HTTP Strict Transport Security (HSTS)
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- Permissions Policy

✅ **Certificate Features**
- Subject Alternative Names (SAN)
- Extended Key Usage
- 4096-bit RSA key
- SHA256 signature algorithm

### URLs
- **HTTPS**: https://l.103.fm:8080 (recommended)
- **HTTP**: http://l.103.fm:8080 (redirects to HTTPS)
- **CA Certificate**: https://l.103.fm:8080/ca-certificate
- **Domain Certificate**: https://l.103.fm:8080/certificate

### Benefits of CA-Signed Approach
- **One-time setup**: Install CA certificate once, trust all future certificates
- **Better security**: Proper certificate chain validation
- **Easier management**: Can create new certificates without browser warnings
- **Professional approach**: Similar to how real CAs work

### Note
After installing the CA certificate, the browser should no longer show the "ERR_CERT_AUTHORITY_INVALID" error. The connection will be treated as secure and trusted.
