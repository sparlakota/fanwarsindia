# Convert an image to a compressed JPEG (used for the hero images; PNGs from image tools are ~2 MB).
# Usage: powershell -File scripts/to-jpeg.ps1 -In "C:\path\image.png" -Out assets/hero/hero-mobile.jpg [-Quality 82] [-MaxWidth 0]
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Quality = 82,
  [int]$MaxWidth = 0
)
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$w = $src.Width; $h = $src.Height
if ($MaxWidth -gt 0 -and $w -gt $MaxWidth) { $h = [int]($h * $MaxWidth / $w); $w = $MaxWidth }

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, 0, 0, $w, $h)

$outPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Out))
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outPath) | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
$bmp.Save($outPath, $codec, $params)

$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Output ("{0}  {1}x{2}  {3} KB" -f $Out, $w, $h, [math]::Round((Get-Item $outPath).Length / 1KB))
