 = " c:\Users\Jmolin\Desktop\op\index.html\
 = [System.IO.File]::ReadAllBytes()
# Read as 1252 (ANSI)
 = [System.Text.Encoding]::GetEncoding(1252)
 = .GetString()

# Fix common corruptions if they got double-encoded earlier
 = .Replace(\GUÃA\, \GUÍA\)
 = .Replace(\MÃ¡ximo\, \Máximo\)
 = .Replace(\Prstamo\, \Préstamo\)
 = .Replace(\prstamo\, \préstamo\)

# Save as UTF8 No BOM
 = New-Object System.Text.UTF8Encoding(False)
[System.IO.File]::WriteAllText(, , )

Write-Host \Rescue complete for index.html\