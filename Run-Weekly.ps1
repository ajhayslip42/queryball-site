<#
    Run-Weekly.ps1 - the whole QueryBall weekly cycle, start to finish.

      1. git pull                      (picks up the nightly data commit)
      2. build_exportfiles.py          rebuilds <season>export.xlsx for the season to date
      3. Excel: refresh -> 32 PDFs     into WeeklyReportQueryball\Outputs\<season>_wk<N>
      4. publish-reports.py            compresses them into public\reports + manifest.json
      5. git commit + push             GitHub Actions builds and deploys queryball.com

    Run it by hand:        powershell -ExecutionPolicy Bypass -File .\Run-Weekly.ps1
    Just the data+PDFs:    ... -File .\Run-Weekly.ps1 -NoPublish
    Just publish again:    ... -File .\Run-Weekly.ps1 -PublishOnly
    Force a week in early: ... -File .\Run-Weekly.ps1 -AllowPartialFtn

    Everything it does is written to Logs\weekly-<date>.log.
#>
[CmdletBinding()]
param(
    [string] $RepoRoot    = "C:\Users\ajhay\OneDrive\Desktop\QueryBall Rework",
    [string] $ExportDir   = "C:\Users\ajhay\Not_Analytics\Queryball - Master Data Repository\WeeklyReport\ExportFiles",
    [string] $Workbook    = "",      # defaults to the newest ReportBaseFile*.xlsm under WeeklyReportQueryball
    [int]    $Season      = 0,       # 0 = work it out from the date
    [switch] $AllowPartialFtn,
    [switch] $NoPublish,
    [switch] $PublishOnly,
    [switch] $KeepExcelOpen
)

$ErrorActionPreference = 'Stop'
$script:Started = Get-Date

$wrq     = Join-Path $RepoRoot 'WeeklyReportQueryball'
$logDir  = Join-Path $wrq 'Logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("weekly-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))

function Say($msg, $colour = 'Gray') {
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
    Write-Host $line -ForegroundColor $colour
    Add-Content -Path $logFile -Value $line
}
function Step($n, $msg) { Say ("=" * 70) 'DarkGray'; Say "STEP $n - $msg" 'Cyan' }
function Die($msg) { Say "FAILED: $msg" 'Red'; Stop-Excel; exit 1 }

$script:Excel = $null
function Stop-Excel {
    if ($script:Excel) {
        try { $script:Excel.DisplayAlerts = $false; $script:Excel.Quit() } catch {}
        try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($script:Excel) } catch {}
        $script:Excel = $null
        [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    }
}

function Find-Python {
    # returns an object, not an array - a one-element array unrolls to a string
    # and $py[0] would then hand back its first character.
    foreach ($c in @('py','python','python3')) {
        $p = Get-Command $c -ErrorAction SilentlyContinue
        if ($p) {
            $pre = @()
            if ($c -eq 'py') { $pre = @('-3') }
            return [pscustomobject]@{ Exe = $p.Source; Pre = $pre }
        }
    }
    Die "Python is not on PATH. Install it from python.org and tick 'Add to PATH'."
}

function Invoke-Py([string[]]$ArgList) {
    $py  = Find-Python
    $all = @($py.Pre) + $ArgList
    Say ("python " + ($ArgList -join ' ')) 'DarkGray'
    # Windows PowerShell 5.1 turns ANY stderr line from a native command into a
    # terminating error while ErrorActionPreference is Stop. pip and python both
    # write ordinary progress to stderr. Function-scoped, so it restores on exit.
    $ErrorActionPreference = 'Continue'
    $out = & $py.Exe @all 2>&1 | ForEach-Object { $_.ToString() }
    $code = $LASTEXITCODE
    $out | ForEach-Object { Add-Content -Path $logFile -Value "    $_"; Write-Host "    $_" -ForegroundColor DarkGray }
    return [pscustomobject]@{ Code = $code; Text = ($out -join "`n") }
}

function Invoke-Git([string[]]$ArgList, [switch]$Quiet) {
    # Same stderr trap as Invoke-Py. `git pull` announces "From https://..." on
    # stderr on every successful fetch, which is why this must not be Stop.
    $ErrorActionPreference = 'Continue'
    $out  = & git @ArgList 2>&1 | ForEach-Object { $_.ToString() }
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if (-not $Quiet) {
        $out | Where-Object { $_ -ne '' } | ForEach-Object {
            Add-Content -Path $logFile -Value "    $_"
            Write-Host "    $_" -ForegroundColor DarkGray
        }
    }
    return [pscustomobject]@{ Code = $code; Lines = @($out | Where-Object { $_ -ne '' }) }
}

# ---------------------------------------------------------------- sanity
Say "QueryBall weekly run - log: $logFile" 'White'
Say ("PowerShell {0} on {1}" -f $PSVersionTable.PSVersion, [Environment]::OSVersion.VersionString) 'DarkGray'
foreach ($p in @($RepoRoot, $wrq)) { if (-not (Test-Path $p)) { Die "folder not found: $p" } }
if (-not (Test-Path $ExportDir)) { Die "ExportFiles folder not found: $ExportDir" }

if (-not $Workbook) {
    $wbFile = Get-ChildItem -Path $wrq -Filter 'ReportBaseFile*.xlsm' -File |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $wbFile) { Die "no ReportBaseFile*.xlsm found in $wrq" }
    $Workbook = $wbFile.FullName
}
if (-not (Test-Path $Workbook)) { Die "workbook not found: $Workbook" }
Say "workbook: $Workbook"

if ($Season -eq 0) {
    $now = Get-Date
    $Season = if ($now.Month -ge 8) { $now.Year } else { $now.Year - 1 }
}
Say "season: $Season"

$scriptsDir = Join-Path $RepoRoot 'scripts'
$buildPy    = Join-Path $scriptsDir 'build_exportfiles.py'
$publishPy  = Join-Path $scriptsDir 'publish-reports.py'
foreach ($f in @($buildPy, $publishPy)) { if (-not (Test-Path $f)) { Die "missing script: $f" } }

Push-Location $RepoRoot
try {
    # ------------------------------------------------------------ 1. pull
    if (-not $PublishOnly) {
        Step 1 'git pull'
        $r = Invoke-Git @('pull','--ff-only')
        if ($r.Code -ne 0) {
            if ($r.Lines -match 'Not possible to fast-forward|diverge') {
                Say 'YOUR LOCAL BRANCH HAS DIVERGED FROM GITHUB' 'Yellow'
                Say '  You have commits GitHub does not, and GitHub has commits you do not' 'Yellow'
                Say '  (the 4 AM bot commits site data most mornings).' 'Yellow'
                Say '  This run still builds the PDFs, but the push at the end WILL be rejected.' 'Yellow'
                Say '  When it finishes, run:   git pull --rebase   then   git push' 'Yellow'
                $script:Diverged = $true
            } else {
                Say 'git pull did not succeed - carrying on with the local copy' 'Yellow'
            }
        }
    }

    # ------------------------------------------------- 2. rebuild the data
    $week = 0
    if (-not $PublishOnly) {
        Step 2 'rebuild the ExportFiles workbook from nflverse'
        $argv = @($buildPy, '--out-dir', $ExportDir, '--season', "$Season")
        if ($AllowPartialFtn) { $argv += '--allow-partial-ftn' }
        $r = Invoke-Py $argv
        if ($r.Code -eq 3) { Say 'nflverse has no complete new week yet - stopping here.' 'Yellow'; exit 0 }
        if ($r.Code -ne 0) { Die "build_exportfiles.py exited $($r.Code)" }
        $m = [regex]::Match($r.Text, 'WEEK=(\d+)')
        if (-not $m.Success) { Die 'could not read the week number back from build_exportfiles.py' }
        $week = [int]$m.Groups[1].Value
        Say "data is complete through week $week" 'Green'
    }

    # ------------------------------------------------------ 3. Excel: PDFs
    $outDir = Join-Path $wrq ("Outputs\{0}_wk{1}" -f $Season, $week)
    if (-not $PublishOnly) {
        Step 3 "refresh the workbook and print 32 PDFs (week $week)"
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null

        $script:Excel = New-Object -ComObject Excel.Application
        $script:Excel.Visible                = $false
        $script:Excel.DisplayAlerts          = $false
        $script:Excel.ScreenUpdating         = $false
        $script:Excel.EnableEvents           = $false
        $script:Excel.AskToUpdateLinks       = $false
        $script:Excel.AutomationSecurity     = 1      # msoAutomationSecurityLow - no macro prompt

        Say 'opening the workbook'
        $wb = $script:Excel.Workbooks.Open($Workbook, 0, $false)

        # Application.Calculation does not exist until a workbook is open - setting
        # it on an empty Excel instance throws 0x800A03EC. So it comes AFTER Open.
        try { $script:Excel.Calculation = -4135 }     # xlCalculationManual
        catch { Say 'could not set manual calculation - the macro sets it anyway' 'Yellow' }

        # Force Power Query to refresh in the foreground. Left in the background it
        # can still be loading when the macro starts printing, which would put
        # last week's numbers in this week's PDFs.
        $nConn = 0
        foreach ($conn in $wb.Connections) {
            try { $conn.OLEDBConnection.BackgroundQuery = $false; $nConn++ } catch {}
        }
        if ($nConn) { Say "$nConn query connection(s) set to foreground" 'DarkGray' }

        Say 'refreshing Power Query (this is the slow bit on a cold start)'
        $wb.RefreshAll()
        try { $script:Excel.CalculateUntilAsyncQueriesDone() } catch {}
        while ($script:Excel.CalculationState -ne 0) { Start-Sleep -Milliseconds 250 }
        Say 'query refresh finished'

        $cover = $wb.Worksheets.Item('Cover Page')
        $cover.Range('K15').Value2 = $Season
        $cover.Range('K11').Value2 = $week
        $script:Excel.Calculate()
        while ($script:Excel.CalculationState -ne 0) { Start-Sleep -Milliseconds 200 }
        Say "Cover Page set to season $Season, week $week"

        # point the macro's output at this week's folder, then put it back
        $before = Get-ChildItem -Path $outDir -Filter *.pdf -ErrorAction SilentlyContinue
        Say 'running PrintAllTeamsUnattended - 32 teams'
        $t0 = Get-Date
        # Application.Run does not always resolve a bare macro name on a workbook
        # opened over COM. Try the qualified forms first.
        $wbName = [System.IO.Path]::GetFileName($Workbook)
        $ran = $false
        foreach ($mName in @("'$wbName'!PrintAllTeamsUnattended",
                             "'$wbName'!Module2.PrintAllTeamsUnattended",
                             'PrintAllTeamsUnattended')) {
            try { $script:Excel.Run($mName) | Out-Null; $ran = $true; Say "  ran as $mName" 'DarkGray'; break }
            catch { }
        }
        if (-not $ran) {
            Say '' 'Yellow'
            Say 'Excel cannot find PrintAllTeamsUnattended in this workbook.' 'Yellow'
            Say 'Almost always one of these two:' 'Yellow'
            Say '  1. Step 2 was not done on THIS file. Save As in Step 1 made a new' 'Yellow'
            Say "     workbook ($wbName); the modules have to be imported into it." 'Yellow'
            Say '     Open it, Alt+F11, expand Modules, and look for' 'Yellow'
            Say '     Sub PrintAllTeamsUnattended at the top of Module2.' 'Yellow'
            Say '  2. The .xlsm is blocked by Windows. Right-click it in File Explorer,' 'Yellow'
            Say '     Properties, tick Unblock at the bottom, OK.' 'Yellow'
            Die 'macro PrintAllTeamsUnattended not found'
        }
        $mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
        Say "macro finished in $mins minutes" 'Green'

        Say 'saving the workbook'
        $wb.Save()
        if (-not $KeepExcelOpen) { $wb.Close($false) }
        Stop-Excel

        # the macro writes to its own OUT_FOLDER; gather whatever is newest
        $macroOut = Join-Path $wrq 'Outputs'
        $fresh = Get-ChildItem -Path $macroOut -Filter *.pdf -File -ErrorAction SilentlyContinue |
                 Where-Object { $_.LastWriteTime -gt $script:Started }
        if ($fresh) {
            Say "moving $($fresh.Count) new PDF(s) into $outDir"
            $fresh | Move-Item -Destination $outDir -Force
        }
        $made = (Get-ChildItem -Path $outDir -Filter *.pdf -File -ErrorAction SilentlyContinue).Count
        Say "$made PDF(s) in $outDir" $(if ($made -ge 32) { 'Green' } else { 'Yellow' })
        if ($made -eq 0) { Die 'the macro produced no PDFs - check the log and the macro OUT_FOLDER' }
        if ($made -lt 32) { Say "expected 32 - check which teams are missing before publishing" 'Yellow' }
    }

    # --------------------------------------------------------- 4. publish
    if ($NoPublish) { Say 'publishing skipped (-NoPublish)' 'Yellow'; exit 0 }

    Step 4 'compress the PDFs into public\reports and update manifest.json'
    $pubSrc = if ($PublishOnly) { Join-Path $wrq 'Outputs' } else { $outDir }
    $r = Invoke-Py @($publishPy, $pubSrc)
    if ($r.Code -ne 0) { Die "publish-reports.py exited $($r.Code)" }

    # --------------------------------------------------------- 5. push
    Step 5 'commit and push - GitHub Actions deploys the site'
    $null   = Invoke-Git @('add','--','public/reports') -Quiet
    $staged = (Invoke-Git @('diff','--cached','--name-only') -Quiet).Lines
    if (-not $staged -or $staged.Count -eq 0) {
        Say 'nothing changed under public/reports - nothing to push.' 'Yellow'; exit 0
    }
    Say "$($staged.Count) file(s) staged"
    $msg = if ($week -gt 0) { "reports: $Season week $week" } else { "reports: $Season update" }
    $r = Invoke-Git @('commit','-m',$msg)
    if ($r.Code -ne 0) { Die 'git commit failed - see the lines above' }
    $r = Invoke-Git @('push')
    if ($r.Code -ne 0) {
        Say 'The PDFs are built, published and committed locally - only the push failed.' 'Yellow'
        Say 'Nothing is lost. Run these two from the repo folder:' 'Yellow'
        Say '    git pull --rebase' 'Yellow'
        Say '    git push' 'Yellow'
        Die 'git push was rejected'
    }

    Say ("DONE in {0} minutes - the deploy runs on GitHub, live in about 3." -f `
         [math]::Round(((Get-Date) - $script:Started).TotalMinutes, 1)) 'Green'
}
finally {
    Stop-Excel
    Pop-Location
}
