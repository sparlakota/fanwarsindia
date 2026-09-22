param(
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$Pad = 6
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($Path)
$w = $src.Width
$h = $src.Height
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    if ($src.GetPixel($x, $y).A -gt 24) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

$x0 = [Math]::Max(0, $minX - $Pad)
$y0 = [Math]::Max(0, $minY - $Pad)
$x1 = [Math]::Min($w - 1, $maxX + $Pad)
$y1 = [Math]::Min($h - 1, $maxY + $Pad)
$cw = $x1 - $x0 + 1
$ch = $y1 - $y0 + 1

$out = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.Clear([System.Drawing.Color]::Transparent)
$srcRect = New-Object System.Drawing.Rectangle($x0, $y0, $cw, $ch)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)
$g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$src.Dispose()

$tmp = $Path + ".tmp.png"
$out.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Move-Item -Force $tmp $Path
"trimmed $Path : ${w}x${h} -> ${cw}x${ch}"
