param(
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$Low = 12,
  [int]$High = 55
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($Path)
$w = $src.Width
$h = $src.Height
$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$rect = New-Object System.Drawing.Rectangle(0,0,$w,$h)
$srcData = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $srcData.Stride * $h
$buffer = New-Object byte[] $bytes
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $buffer, 0, $bytes)

$outBuffer = New-Object byte[] $bytes

for ($y = 0; $y -lt $h; $y++) {
  $rowStart = $y * $srcData.Stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $rowStart + $x * 4
    $b = $buffer[$i]
    $g = $buffer[$i+1]
    $r = $buffer[$i+2]
    $a = $buffer[$i+3]

    $maxc = [Math]::Max($r, [Math]::Max($g, $b))
    if ($maxc -le $Low) {
      $newA = 0
    } elseif ($maxc -ge $High) {
      $newA = $a
    } else {
      $frac = ($maxc - $Low) / [double]($High - $Low)
      $newA = [int]($a * $frac)
    }

    $outBuffer[$i]   = $b
    $outBuffer[$i+1] = $g
    $outBuffer[$i+2] = $r
    $outBuffer[$i+3] = $newA
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($outBuffer, 0, $dstData.Scan0, $bytes)
$src.UnlockBits($srcData)
$out.UnlockBits($dstData)
$src.Dispose()

$tmp = $Path + ".tmp.png"
$out.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Move-Item -Force $tmp $Path
"processed $Path ($w x $h)"
