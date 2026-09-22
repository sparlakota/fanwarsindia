Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\shaba\Downloads\Telugu Cinema Fan Wars Arena.png"
$dstPath = "D:\Claude Projects\Fan Wars India\assets\hero\hero-bg.jpg"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$g = [System.Drawing.Graphics]::FromImage($src)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$rectX = 500
$rectY = 0
$rectW = 690
$rectH = 480
$rect = New-Object System.Drawing.Rectangle $rectX, $rectY, $rectW, $rectH

$colorTop = [System.Drawing.Color]::FromArgb(255, 11, 14, 18)
$colorBot = [System.Drawing.Color]::FromArgb(255, 46, 37, 32)

$brushTop = New-Object System.Drawing.Point $rectX, 0
$brushBot = New-Object System.Drawing.Point $rectX, $rectH

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $brushTop, $brushBot, $colorTop, $colorBot

$blend = New-Object System.Drawing.Drawing2D.ColorBlend 4
$blend.Colors = [System.Drawing.Color[]]@(
  [System.Drawing.Color]::FromArgb(255, 11, 14, 18),
  [System.Drawing.Color]::FromArgb(255, 18, 19, 21),
  [System.Drawing.Color]::FromArgb(255, 34, 26, 21),
  [System.Drawing.Color]::FromArgb(255, 46, 37, 32)
)
$blend.Positions = [single[]]@(0.0, 0.42, 0.82, 1.0)
$brush.InterpolationColors = $blend

$g.FillRectangle($brush, $rect)

$g.Dispose()
$brush.Dispose()

$src.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$src.Dispose()
"saved $dstPath"
