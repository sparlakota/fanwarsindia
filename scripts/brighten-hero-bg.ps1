Add-Type -AssemblyName System.Drawing

$path = "D:\Claude Projects\Fan Wars India\assets\hero\hero-bg.jpg"
$src = [System.Drawing.Bitmap]::FromFile($path)
$w = $src.Width
$h = $src.Height

$out = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($out)

$attrs = New-Object System.Drawing.Imaging.ImageAttributes

# Gamma-lift shadows/midtones (great for a dark night photo) plus a mild
# linear contrast/brightness nudge so it doesn't turn flat/grey.
$attrs.SetGamma(1.55)

$matrix = New-Object System.Drawing.Imaging.ColorMatrix
$s = 1.12  # slight contrast
$b = 0.06  # slight brightness offset
$matrix.Matrix00 = $s
$matrix.Matrix11 = $s
$matrix.Matrix22 = $s
$matrix.Matrix33 = 1
$matrix.Matrix44 = 1
$matrix.Matrix40 = $b
$matrix.Matrix41 = $b
$matrix.Matrix42 = $b
$attrs.SetColorMatrix($matrix)

$destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$g.DrawImage($src, $destRect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attrs)

$g.Dispose()
$src.Dispose()

$tmp = $path + ".tmp.jpg"
$out.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$out.Dispose()
Move-Item -Force $tmp $path
"brightened $path"
