param(
    [int]$Port = 8791,
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://127.0.0.1:$Port/"

$mime = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".json" = "application/json"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }
    $req = $context.Request
    $res = $context.Response
    try {
        $path = $req.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $Root ($path.TrimStart("/"))
        $filePath = [System.IO.Path]::GetFullPath($filePath)

        if (-not $filePath.StartsWith([System.IO.Path]::GetFullPath($Root))) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mime[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = $contentType
            $res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $res.OutputStream.Write($notFound, 0, $notFound.Length)
        }
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        $res.Close()
    }
}
