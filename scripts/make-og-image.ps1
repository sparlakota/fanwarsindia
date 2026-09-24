# Builds assets/og/og-image.jpg (1200x630) — the link-preview image WhatsApp/X/Facebook show
# when someone shares fanwarsindia.com. Hero photo + dark scrim + the real logo lockup.
param(
  [string]$Hero = "assets/hero/hero-bg.jpg",
  [string]$Logo = "assets/logo/fanwarsindia-logo.png",
  [string]$Out  = "assets/og/og-image.jpg"
)
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$root = Split-Path -Parent $PSScriptRoot
$heroImg = [System.Drawing.Image]::FromFile((Join-Path $root $Hero))
$logoImg = [System.Drawing.Image]::FromFile((Join-Path $root $Logo))

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Cover-fit the hero, biased toward the crowd (lower half) rather than the empty sky.
$scale = [Math]::Max($W / $heroImg.Width, $H / $heroImg.Height)
$dw = [int]($heroImg.Width * $scale); $dh = [int]($heroImg.Height * $scale)
$dx = [int](($W - $dw) / 2); $dy = [int](($H - $dh) * 0.6)
$g.DrawImage($heroImg, $dx, $dy, $dw, $dh)

$scrim = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 5, 5, 5))
$g.FillRectangle($scrim, 0, 0, $W, $H)

$lh = 440
$lw = [int]($logoImg.Width * ($lh / $logoImg.Height))
$g.DrawImage($logoImg, [int](($W - $lw) / 2), [int](($H - $lh) / 2), $lw, $lh)

$outPath = Join-Path $root $Out
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outPath) | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88L
$bmp.Save($outPath, $codec, $params)

$g.Dispose(); $bmp.Dispose(); $heroImg.Dispose(); $logoImg.Dispose(); $scrim.Dispose()
Write-Output "Wrote $outPath"
