# Reliable PowerShell HTTP Static Server for Localhost
$port = 3000
$basePath = "C:\Users\alexa\.gemini\antigravity-ide\scratch\stitch-app"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$($port)/")
$listener.Prefixes.Add("http://127.0.0.1:$($port)/")

try {
    $listener.Start()
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host " Stitch Studio Server is running!       " -ForegroundColor Green
    Write-Host " Localhost URL: http://localhost:$($port)/ " -ForegroundColor Yellow
    Write-Host " Serving Path:  $basePath               " -ForegroundColor Gray
    Write-Host "=========================================" -ForegroundColor Cyan
}
catch {
    Write-Error "Failed to start listener on port $($port)"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "/index.html"
        }

        $localFilePath = Join-Path $basePath $urlPath.TrimStart('/').Replace('/', '\')
        $resolved = [System.IO.Path]::GetFullPath($localFilePath)

        if ($resolved.StartsWith($basePath, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $resolved -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType
            $response.StatusCode = 200
            
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            $bytes = [System.IO.File]::ReadAllBytes($resolved)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        else {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $response.Close()
    }
    catch {
        # Silent continue on loop errors
    }
}
