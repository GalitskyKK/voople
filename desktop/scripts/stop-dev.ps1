$ErrorActionPreference = "Stop"

$desktopRoot = (Resolve-Path (Split-Path $PSScriptRoot -Parent)).Path
$projectRoot = (Resolve-Path (Join-Path $desktopRoot "..")).Path
$ports = @(1420, 3000)
$stopped = @()

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $processId = [int]$connection.OwningProcess
    if ($processId -le 0) { continue }

    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    $commandLine = [string]$processInfo.CommandLine
    $belongsToProject =
      $commandLine.IndexOf($desktopRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
      $commandLine.IndexOf($projectRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0

    if (-not $belongsToProject) {
      Write-Warning "Порт $port занят сторонним процессом $processId; он не остановлен."
      continue
    }

    Stop-Process -Id $processId -Force
    $stopped += "${processId} (порт ${port})"
  }
}

if ($stopped.Count -eq 0) {
  Write-Host "Процессы разработки Voople не найдены."
} else {
  Write-Host "Остановлены процессы Voople: $($stopped -join ', ')."
}
