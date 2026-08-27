param(
    [Parameter(Mandatory = $true)]
    [string]$DocxPath,

    [Parameter(Mandatory = $true)]
    [string]$PdfPath
)

$ErrorActionPreference = 'Stop'
$resolvedDocx = (Resolve-Path -LiteralPath $DocxPath).Path
$resolvedPdf = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PdfPath))
$pdfDirectory = Split-Path -Parent $resolvedPdf
if (-not (Test-Path -LiteralPath $pdfDirectory)) {
    New-Item -ItemType Directory -Path $pdfDirectory -Force | Out-Null
}

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    # Open read-only so pagination/export cannot re-introduce author metadata.
    $document = $word.Documents.Open($resolvedDocx, $false, $true)
    $document.Repaginate()
    $document.Fields.Update() | Out-Null
    $document.ExportAsFixedFormat($resolvedPdf, 17)

    Write-Output $resolvedPdf
    Write-Output ("Pages=" + $document.ComputeStatistics(2))
}
finally {
    if ($null -ne $document) {
        $document.Close(0)
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
    }
    if ($null -ne $word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
