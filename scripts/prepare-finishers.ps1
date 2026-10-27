# Decode the supplied GIFs without changing them. GDI+ composites their frames.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $projectRoot 'public/assets/special'
$outputRoot = Join-Path $assetRoot 'derived'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$manifest = @{}
foreach ($character in @('alex', 'lua')) {
    $source = [System.Drawing.Image]::FromFile((Join-Path $assetRoot "$character-special.gif"))
    try {
        $count = $source.GetFrameCount([System.Drawing.Imaging.FrameDimension]::Time)
        $delays = $source.GetPropertyItem(20736).Value
        $size = 512
        $sheet = [System.Drawing.Bitmap]::new($size * 4, $size * [Math]::Ceiling($count / 4.0))
        $graphics = [System.Drawing.Graphics]::FromImage($sheet)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
            $durations = @()
            for ($index = 0; $index -lt $count; $index++) {
                $source.SelectActiveFrame([System.Drawing.Imaging.FrameDimension]::Time, $index) | Out-Null
                $destination = [System.Drawing.Rectangle]::new(($index % 4) * $size, [Math]::Floor($index / 4) * $size, $size, $size)
                $graphics.DrawImage($source, $destination, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
                $durations += [Math]::Max(20, [BitConverter]::ToInt32($delays, $index * 4) * 10)
            }
            $sheet.Save((Join-Path $outputRoot "$character-finisher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
            $manifest[$character] = @{frameSize=$size;frames=$count;durations=$durations;durationMs=($durations | Measure-Object -Sum).Sum}
        } finally { $graphics.Dispose(); $sheet.Dispose() }
    } finally { $source.Dispose() }
}
$json = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $outputRoot 'timings.json'), $json, [System.Text.UTF8Encoding]::new($false))
Write-Output $json
