$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$iconRoot=Split-Path -Parent $PSScriptRoot
$master=[System.Drawing.Image]::FromFile((Join-Path $iconRoot 'assets/darkfire-icon-master.png'))
function Export-Icon([string]$relative,[int]$size,[double]$scale){
  $bitmap=New-Object System.Drawing.Bitmap($size,$size)
  $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
  try{
    $graphics.Clear([System.Drawing.Color]::FromArgb(8,8,8))
    $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $extent=[int]($size*$scale);$offset=[int](($size-$extent)/2)
    $graphics.DrawImage($master,$offset,$offset,$extent,$extent)
    $bitmap.Save((Join-Path $iconRoot $relative),[System.Drawing.Imaging.ImageFormat]::Png)
  }finally{$graphics.Dispose();$bitmap.Dispose()}
}
try{
  Export-Icon 'icon-192.png' 192 .84
  Export-Icon 'icon-512.png' 512 .84
  Export-Icon 'icon-maskable-512.png' 512 .64
  foreach($density in @(@('mdpi',48,108),@('hdpi',72,162),@('xhdpi',96,216),@('xxhdpi',144,324),@('xxxhdpi',192,432))){
    $folder='android/app/src/main/res/mipmap-'+$density[0]
    Export-Icon ($folder+'/ic_launcher.png') $density[1] .84
    Export-Icon ($folder+'/ic_launcher_round.png') $density[1] .64
    Export-Icon ($folder+'/ic_launcher_foreground.png') $density[2] .60
  }
}finally{$master.Dispose()}
