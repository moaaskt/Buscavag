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

# 2. Definir e preparar o diretório do perfil dedicado
$profileDir = "C:\buscavag-chrome-profile"
try {
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
} catch {
    # Fallback caso C:\ exija elevação de privilégios
    $profileDir = "$env:LOCALAPPDATA\buscavag-chrome-profile"
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
}

# 3. Limpar travas órfãs e dumps de falha que impedem o Chrome de iniciar
$staleLocks = @(
    "$profileDir\Singleton*",
    "$profileDir\lockfile",
    "$profileDir\Crashpad\reports\*"
)
foreach ($pattern in $staleLocks) {
    Remove-Item -Path $pattern -Force -Recurse -ErrorAction SilentlyContinue
}

# 4. Verificar se a porta 9222 já está em uso e liberar se necessário
$existingPort = Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue
if ($existingPort) {
    Write-Host "⚠️ Porta 9222 já estava ocupada por processo anterior (PID: $($existingPort.OwningProcess)). Finalizando..." -ForegroundColor Yellow
    Stop-Process -Id $existingPort.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "👉 Executável Chrome: $chromeExe" -ForegroundColor Gray
Write-Host "👉 Perfil Dedicado:   $profileDir" -ForegroundColor Gray
Write-Host "👉 Porta de Debug:    9222" -ForegroundColor Gray
Write-Host "👉 URL Inicial:       https://www.linkedin.com/login" -ForegroundColor Gray
Write-Host ""
Write-Host "Iniciando Google Chrome..." -ForegroundColor Green

# 5. Argumentos sanitizados para depuração remota via CDP
$arguments = @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$profileDir",
    "--remote-allow-origins=*",
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.linkedin.com/login"
)

Start-Process -FilePath $chromeExe -ArgumentList $arguments

Write-Host ""
Write-Host "======================================================" -ForegroundColor Yellow
Write-Host "  INSTRUÇÕES DE AUTENTICAÇÃO" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Yellow
Write-Host "1. A janela do Google Chrome foi aberta na página oficial de login." -ForegroundColor White
Write-Host "2. Digite seu e-mail e senha do LinkedIn e faça o login normalmente." -ForegroundColor White
Write-Host "3. Após logar e visualizar a tela inicial (Feed), execute em outro terminal:" -ForegroundColor Cyan
Write-Host "   npm run auth:linkedin" -ForegroundColor Green
Write-Host "   (Esse comando vai sincronizar os cookies para o .env e testar o scraper!)" -ForegroundColor Gray
Write-Host "4. Mantenha essa janela do Chrome aberta em segundo plano." -ForegroundColor White
Write-Host ""
