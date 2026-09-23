<#
.SYNOPSIS
    Script de descarga de videos de SceneAI para Windows PowerShell.
.DESCRIPTION
    Descarga todos los videos (MP4/MOV) del catalogo local de SceneAI.
.EXAMPLE
    .\download-assets.ps1
#>

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$videosDir = Join-Path $baseDir "videos"
$lpDir = Join-Path $videosDir "landing-pages"
$bgDir = Join-Path $videosDir "backgrounds"

New-Item -ItemType Directory -Force -Path $lpDir | Out-Null
New-Item -ItemType Directory -Force -Path $bgDir | Out-Null

$lpFile = Join-Path $baseDir "video-catalog.json"
$bgFile = Join-Path $baseDir "background-videos.json"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "🎬 SceneAI Windows Video Downloader" -ForegroundColor Cyan
Write-Host "Destino: $videosDir" -ForegroundColor DarkGray
Write-Host "======================================================" -ForegroundColor Cyan

if (Test-Path $lpFile) {
    $lpList = Get-Content $lpFile -Raw | ConvertFrom-Json
    Write-Host "`nDescargando videos de Landing Pages ($($lpList.Count))..." -ForegroundColor Yellow
    $i = 0
    foreach ($item in $lpList) {
        $i++
        if ($item.videoUrl) {
            $ext = [System.IO.Path]::GetExtension($item.videoUrl)
            if (-not $ext) { $ext = ".mp4" }
            $cleanTitle = ($item.title -replace '[\\/*?:"<>|]', '_').Trim()
            $fileName = "$($item.id)_$cleanTitle$ext"
            $dest = Join-Path $lpDir $fileName

            if (Test-Path $dest) {
                Write-Host "[$i/$($lpList.Count)] ⏩ Ya existe: $fileName" -ForegroundColor DarkGray
                continue
            }

            Write-Host "[$i/$($lpList.Count)] ⬇️ Descargando: $($item.title)..." -ForegroundColor White
            try {
                Invoke-WebRequest -Uri $item.videoUrl -OutFile $dest -TimeoutSec 60 -ErrorAction Stop
                Write-Host "    ✅ OK: $fileName" -ForegroundColor Green
            } catch {
                Write-Host "    ❌ Error al descargar: $_" -ForegroundColor Red
            }
        }
    }
}

if (Test-Path $bgFile) {
    $bgList = Get-Content $bgFile -Raw | ConvertFrom-Json
    Write-Host "`nDescargando videos de Backgrounds ($($bgList.Count))..." -ForegroundColor Yellow
    $j = 0
    foreach ($item in $bgList) {
        $j++
        if ($item.videoUrl) {
            $ext = [System.IO.Path]::GetExtension($item.videoUrl)
            if (-not $ext) { $ext = ".mp4" }
            $cleanTitle = ($item.title -replace '[\\/*?:"<>|]', '_').Trim()
            $fileName = "$($item.id)_$cleanTitle$ext"
            $dest = Join-Path $bgDir $fileName

            if (Test-Path $dest) {
                Write-Host "[$j/$($bgList.Count)] ⏩ Ya existe: $fileName" -ForegroundColor DarkGray
                continue
            }

            Write-Host "[$j/$($bgList.Count)] ⬇️ Descargando: $($item.title)..." -ForegroundColor White
            try {
                Invoke-WebRequest -Uri $item.videoUrl -OutFile $dest -TimeoutSec 60 -ErrorAction Stop
                Write-Host "    ✅ OK: $fileName" -ForegroundColor Green
            } catch {
                Write-Host "    ❌ Error al descargar: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n🎉 Proceso completado." -ForegroundColor Green
