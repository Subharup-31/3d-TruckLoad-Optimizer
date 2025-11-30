# PowerShell script to generate self-signed SSL certificate for local HTTPS development
# This enables camera access on mobile devices via local network

Write-Host "🔐 Generating self-signed SSL certificate for local development..." -ForegroundColor Cyan

# Create .cert directory
if (-not (Test-Path ".cert")) {
    New-Item -ItemType Directory -Path ".cert" | Out-Null
    Write-Host "✅ Created .cert directory" -ForegroundColor Green
}

# Check if OpenSSL is installed
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $opensslPath) {
    Write-Host "❌ OpenSSL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "2. Install and add to PATH" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use ngrok for HTTPS (see SETUP.md)" -ForegroundColor Cyan
    exit 1
}

# Generate certificate
Write-Host "Generating certificate (you'll be asked some questions)..." -ForegroundColor Yellow
Write-Host "You can press Enter to use defaults for most fields" -ForegroundColor Gray

openssl req -x509 -newkey rsa:2048 -keyout .cert/key.pem -out .cert/cert.pem -days 365 -nodes -subj "/CN=localhost"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Certificate generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Files created:" -ForegroundColor Cyan
    Write-Host "   .cert/key.pem" -ForegroundColor Gray
    Write-Host "   .cert/cert.pem" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm run dev" -ForegroundColor White
    Write-Host "2. Access via: https://localhost:3000" -ForegroundColor White
    Write-Host "3. Accept security warning (self-signed cert)" -ForegroundColor White
    Write-Host "4. On mobile, use: https://YOUR_IP:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 To find your IP address, run: ipconfig" -ForegroundColor Yellow
} else {
    Write-Host "❌ Certificate generation failed!" -ForegroundColor Red
    Write-Host "Check the error message above" -ForegroundColor Yellow
}
