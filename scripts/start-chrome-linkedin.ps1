# ==============================================================================
# BUSCAVAG - INICIALIZADOR DO CHROME COM SESSÃO PERSISTENTE E PORTA CDP (9222)
# ==============================================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  BUSCAVAG - CHROME AUTONOMOUS SESSION LAUNCHER" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Localizar executável do Google Chrome
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromeExe = $path
        break
    }
}

if (-not $chromeExe) {
    Write-Host "❌ Google Chrome não foi encontrado nos caminhos padrão." -ForegroundColor Red
    Write-Host "Por favor, instale o Google Chrome oficial ou adicione ao PATH." -ForegroundColor Yellow
    exit 1
}

# 2. Definir diretório do perfil dedicado
$profileDir = "C:\buscavag-chrome-profile"
try {
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
} catch {
    # Fallback se C:\ exigir elevação de privilégios de administrador
    $profileDir = "$env:USERPROFILE\buscavag-chrome-profile"
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
}

Write-Host "👉 Executável Chrome: $chromeExe" -ForegroundColor Gray
Write-Host "👉 Perfil Dedicado:   $profileDir" -ForegroundColor Gray
Write-Host "👉 Porta de Debug:    9222" -ForegroundColor Gray
Write-Host ""
Write-Host "Iniciando Google Chrome..." -ForegroundColor Green

# 3. Argumentos para depuração remota via CDP
$arguments = @(
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$profileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.linkedin.com/feed/"
)

Start-Process -FilePath $chromeExe -ArgumentList $arguments

Write-Host ""
Write-Host "======================================================" -ForegroundColor Yellow
Write-Host "  INSTRUÇÕES DE AUTENTICAÇÃO" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Yellow
Write-Host "1. A janela do Google Chrome foi aberta."
Write-Host "2. Faça login na sua conta do LinkedIn normalmente (com 2FA/senha)."
Write-Host "3. Mantenha essa janela aberta em segundo plano (ou minimizada)."
Write-Host "4. O Buscavag se conectará a ela pela porta 9222 sem acionar checkpoints anti-bot!"
Write-Host ""
Write-Host "🚀 Pronto! O scraper do LinkedIn agora pode rodar a qualquer momento." -ForegroundColor Green
Write-Host ""

