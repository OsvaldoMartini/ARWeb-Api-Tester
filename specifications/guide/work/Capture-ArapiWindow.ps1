param(
  [Parameter(Mandatory = $true)]
  [int]$TargetProcessId,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$ClickX = -1,
  [int]$ClickY = -1,
  [string]$Keys = '',
  [int]$WaitMilliseconds = 600,
  [bool]$ResetScroll = $true
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class ArapiWindowCapture
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int command);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr insertAfter,
        int x,
        int y,
        int width,
        int height,
        uint flags
    );

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
'@

$process = Get-Process -Id $TargetProcessId -ErrorAction Stop
$process.Refresh()
$handle = $process.MainWindowHandle
if ($handle -eq [IntPtr]::Zero) {
  Start-Sleep -Milliseconds 500
  $process.Refresh()
  $handle = $process.MainWindowHandle
}
if ($handle -eq [IntPtr]::Zero) {
  throw "Process $TargetProcessId does not have a visible main window."
}

[void][ArapiWindowCapture]::ShowWindow($handle, 9)
[void][ArapiWindowCapture]::SetWindowPos($handle, [IntPtr](-1), 0, 0, 0, 0, 0x0053)
[void][ArapiWindowCapture]::BringWindowToTop($handle)
[void][ArapiWindowCapture]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 350

$rect = [ArapiWindowCapture+RECT]::new()
if (-not [ArapiWindowCapture]::GetWindowRect($handle, [ref]$rect)) {
  throw "Could not read the ARAPI window rectangle."
}

if ($ClickX -ge 0 -and $ClickY -ge 0) {
  [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(
    $rect.Left + $ClickX,
    $rect.Top + $ClickY
  )
  [ArapiWindowCapture]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  [ArapiWindowCapture]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  if (-not [string]::IsNullOrWhiteSpace($Keys)) {
    Start-Sleep -Milliseconds 150
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
  }
  Start-Sleep -Milliseconds $WaitMilliseconds
  if ($ResetScroll) {
    [System.Windows.Forms.SendKeys]::SendWait('^{HOME}')
    Start-Sleep -Milliseconds 200
  }
}

[System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(
  $rect.Left + [Math]::Min(700, ($rect.Right - $rect.Left) - 20),
  $rect.Top + 14
)

[void][ArapiWindowCapture]::SetWindowPos($handle, [IntPtr](-1), 0, 0, 0, 0, 0x0053)
[void][ArapiWindowCapture]::BringWindowToTop($handle)
[void][ArapiWindowCapture]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 200

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) {
  throw "ARAPI window has an invalid size: ${width}x${height}."
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputFullPath)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen(
    [System.Drawing.Point]::new($rect.Left, $rect.Top),
    [System.Drawing.Point]::Empty,
    [System.Drawing.Size]::new($width, $height)
  )
  $bitmap.Save($outputFullPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  [void][ArapiWindowCapture]::SetWindowPos($handle, [IntPtr](-2), 0, 0, 0, 0, 0x0053)
}

Write-Output $outputFullPath
