
$extensions = @('.html','.js','.css','.json','.txt','.md','.sql','.xml','.yml','.yaml','.ps1','.svg','.csv')

$files = Get-ChildItem -Path . -Recurse -File |
    Where-Object {
        $extensions -contains $_.Extension.ToLowerInvariant() -and
        $_.FullName -notmatch '[\\/](node_modules|\.git|vendor|dist|build)[\\/]' -and
        $_.Name -notmatch '\.backup|\.bak$|\.old$|\.orig$|~$' -and
        $_.Name -ne 'scan-mojibake.ps1'
    }

$markers = @(
    [string][char]0x00C3
    [string][char]0x00C2
    [string][char]0x00E2
    [string][char]0x00F0
    [string][char]0x00EF
    [string][char]0xFFFD
)

$results = foreach ($file in $files) {
    Select-String -LiteralPath $file.FullName -Pattern $markers -SimpleMatch
}

if ($results) {
    $results | Select-Object Path,LineNumber,Line | Format-List
    Write-Host "Suspicious lines found: $($results.Count)"
} else {
    Write-Host "No suspicious characters found."
}
