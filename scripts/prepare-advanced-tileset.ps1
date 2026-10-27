# Lossless packing of the 64 supplied, already cropped tiles. Sources stay intact.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$frames = Join-Path $projectRoot 'public/assets/tilesets/advanced-industrial-frames'
$sheet = [System.Drawing.Bitmap]::new(512,512)
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
try {
    for($index=0;$index -lt 64;$index++) {
        $tile = [System.Drawing.Bitmap]::FromFile((Join-Path $frames ('tile_{0:D2}.png' -f $index)))
        try {
            if($tile.Width -ne 64 -or $tile.Height -ne 64){throw "Invalid dimensions for tile $index"}
            $graphics.DrawImageUnscaled($tile,($index%8)*64,[Math]::Floor($index/8)*64)
        } finally {$tile.Dispose()}
    }
    $sheet.Save((Join-Path $projectRoot 'public/assets/tilesets/advanced-industrial.png'),[System.Drawing.Imaging.ImageFormat]::Png)
} finally {$graphics.Dispose();$sheet.Dispose()}
