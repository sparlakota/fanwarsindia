Add-Type -AssemblyName System.Drawing

$srcDir = "C:\Users\shaba\Downloads"
$dstDir = "D:\Claude Projects\Fan Wars India\assets\actors"

# downloaded filename -> actor slug
$map = @{
  "Pawan Kalyan.jpg"       = "pawan-kalyan"
  "Prabhas.jpg"            = "prabhas"
  "Allu Arjun.jpg"         = "allu-arjun"
  "Mahesh Babu.jpg"        = "mahesh-babu"
  "Jr NTR.jpg"             = "jr-ntr"
  "Ram Charan.jpg"         = "ram-charan"
  "Chiranjeevi.jpg"        = "chiranjeevi"
  "Balakrishna.jpg"        = "balakrishna"
  "Nagarjuna.jpg"          = "nagarjuna"
  "Venkatesh.jpg"          = "venkatesh"
  "Ravi Teja.jpg"          = "ravi-teja"
  "Nani.jpg"               = "nani"
  "Vijay Devarakonda.jpg"  = "vijay-deverakonda"
  "Naga Chaitanya.jpg"     = "naga-chaitanya"
  "Nithin.jpg"             = "nithiin"
  "Sharwanand.jpg"         = "sharwanand"
  "Akhil Akkineni.jpg"     = "akhil-akkineni"
  "Rana Daggubati.jpg"     = "rana-daggubati"
  "Ram Pothineni.jpg"      = "ram-pothineni"
  "Adivi Sesh.jpg"         = "adivi-sesh"
}

# Target portrait ratio matches the leaderboard/fan-card crop (~4:5)
$targetRatio = 0.8
$maxOutHeight = 900

foreach ($key in $map.Keys) {
  $srcPath = Join-Path $srcDir $key
  $slug = $map[$key]
  $dstPath = Join-Path $dstDir "$slug.jpg"

  $src = [System.Drawing.Bitmap]::FromFile($srcPath)
  $w = $src.Width
  $h = $src.Height
  $currentRatio = $w / $h

  if ($currentRatio -gt $targetRatio) {
    # too wide -> crop left/right, keep horizontal center
    $cropW = [int]($h * $targetRatio)
    $cropH = $h
    $cropX = [int](($w - $cropW) / 2)
    $cropY = 0
  } else {
    # too tall -> crop top/bottom, bias slightly above center to favor the face
    $cropW = $w
    $cropH = [int]($w / $targetRatio)
    $cropX = 0
    $available = $h - $cropH
    $cropY = [int]($available * 0.32)
    if ($cropY -lt 0) { $cropY = 0 }
  }

  $cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

  $outH = [Math]::Min($maxOutHeight, $cropH)
  $outW = [int]($outH * $targetRatio)

  $out = New-Object System.Drawing.Bitmap($outW, $outH)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $destRect = New-Object System.Drawing.Rectangle(0, 0, $outW, $outH)
  $g.DrawImage($src, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $src.Dispose()

  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88L)
  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }

  $out.Save($dstPath, $jpegCodec, $encoderParams)
  $out.Dispose()

  "$key -> $slug.jpg  (src ${w}x$h, out ${outW}x$outH)"
}
