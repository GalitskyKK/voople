param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [switch]$RequireAuthenticode
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $IsWindows) {
  throw "The installed desktop deep-link smoke requires Windows."
}

$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$protocolKey = "Registry::HKEY_CURRENT_USER\Software\Classes\voople"
if (Test-Path -LiteralPath $protocolKey) {
  throw "Refusing to replace an existing voople protocol registration on this runner."
}

$signature = Get-AuthenticodeSignature -LiteralPath $installer
if ($RequireAuthenticode -and $signature.Status -ne "Valid") {
  throw "The installed-app gate requires a valid Authenticode signature; got $($signature.Status)."
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VoopleWindowState {
  [DllImport("user32.dll")]
  public static extern bool IsIconic(IntPtr handle);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr handle, int command);
}
"@

$installedExecutable = $null
$uninstaller = $null
$coldUri = "voople://room-invites/10000000-0000-4000-8000-000000000001"
$warmUri = "voople://room-invites/20000000-0000-4000-8000-000000000002"
$invalidUri = "${warmUri}?accept=1"

function Get-InstalledProcesses {
  if ([string]::IsNullOrWhiteSpace($script:installedExecutable)) { return @() }
  $processName = [IO.Path]::GetFileNameWithoutExtension($script:installedExecutable)
  return @(
    Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object {
      try { [IO.Path]::GetFullPath($_.Path) -ieq $script:installedExecutable } catch { $false }
    }
  )
}

function Wait-InstalledProcess {
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  while ([DateTime]::UtcNow -lt $deadline) {
    $processes = @(Get-InstalledProcesses)
    if ($processes.Count -eq 1) {
      $processes[0].Refresh()
      if ($processes[0].MainWindowHandle -ne [IntPtr]::Zero) { return $processes[0] }
    }
    Start-Sleep -Milliseconds 250
  }
  throw "The installed Voople process did not expose exactly one main window."
}

function Open-VoopleProtocol([string]$Uri) {
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $Uri
  $startInfo.UseShellExecute = $true
  [Diagnostics.Process]::Start($startInfo) | Out-Null
}

try {
  $install = Start-Process -FilePath $installer -ArgumentList "/S" -PassThru -Wait -WindowStyle Hidden
  if ($install.ExitCode -ne 0) { throw "Silent NSIS installation failed with exit code $($install.ExitCode)." }

  $commandKey = Join-Path $protocolKey "shell\open\command"
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while (-not (Test-Path -LiteralPath $commandKey) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path -LiteralPath $commandKey)) {
    throw "The NSIS installer did not register the voople protocol for the current user."
  }

  $protocolCommand = (Get-Item -LiteralPath $commandKey).GetValue("")
  if ($protocolCommand -notmatch '^"(?<exe>[^"]+)"\s+"%1"$') {
    throw "The protocol command must quote both the executable and %1 argument."
  }
  $installedExecutable = [IO.Path]::GetFullPath($Matches.exe)
  if (-not (Test-Path -LiteralPath $installedExecutable -PathType Leaf)) {
    throw "The registered protocol executable does not exist: $installedExecutable"
  }
  $uninstaller = Join-Path (Split-Path -Parent $installedExecutable) "uninstall.exe"
  if (-not (Test-Path -LiteralPath $uninstaller -PathType Leaf)) {
    throw "The installed NSIS uninstaller is missing: $uninstaller"
  }

  foreach ($process in @(Get-InstalledProcesses)) {
    Stop-Process -Id $process.Id -Force
    Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
  }

  Open-VoopleProtocol $coldUri
  $app = Wait-InstalledProcess
  $coldProcessId = $app.Id

  [VoopleWindowState]::ShowWindowAsync($app.MainWindowHandle, 6) | Out-Null
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while (-not [VoopleWindowState]::IsIconic($app.MainWindowHandle) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 100
  }
  if (-not [VoopleWindowState]::IsIconic($app.MainWindowHandle)) {
    throw "Could not minimize the installed app before the warm-link check."
  }

  Open-VoopleProtocol $warmUri
  $app = Wait-InstalledProcess
  if ($app.Id -ne $coldProcessId) {
    throw "The warm deep link created a different Voople process instead of reusing the installed instance."
  }
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([VoopleWindowState]::IsIconic($app.MainWindowHandle) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 100
  }
  if ([VoopleWindowState]::IsIconic($app.MainWindowHandle)) {
    throw "The warm deep link did not restore the existing main window."
  }

  Open-VoopleProtocol $invalidUri
  Start-Sleep -Seconds 1
  $remainingProcesses = @(Get-InstalledProcesses)
  if ($remainingProcesses.Count -ne 1 -or $remainingProcesses[0].Id -ne $coldProcessId) {
    throw "Deep links must leave exactly one installed Voople instance running."
  }

  Write-Host "Installed NSIS protocol smoke passed: registration, cold protocol launch, warm single-instance restore and invalid-link single-instance handling."
} finally {
  foreach ($process in @(Get-InstalledProcesses)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
  }
  if ($uninstaller -and (Test-Path -LiteralPath $uninstaller -PathType Leaf)) {
    $remove = Start-Process -FilePath $uninstaller -ArgumentList "/S" -PassThru -Wait -WindowStyle Hidden
    if ($remove.ExitCode -ne 0) {
      Write-Warning "Silent NSIS uninstall returned exit code $($remove.ExitCode)."
    }
  }
}

if (Test-Path -LiteralPath $protocolKey) {
  throw "The NSIS uninstaller left the voople protocol registered."
}
