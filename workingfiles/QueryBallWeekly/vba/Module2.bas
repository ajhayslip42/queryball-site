Attribute VB_Name = "Module2"
Option Explicit

Rem FIX Nov-2026: silent entry point for Run-Weekly.ps1. A MsgBox with nobody
Rem there to click OK hangs a scheduled run forever.
Public gUnattended As Boolean

Private Const OUT_FOLDER As String = _
    "C:\Users\ajhay\OneDrive\Desktop\QueryBall Rework\WeeklyReportQueryball\Outputs\"

Sub PrintAllTeamsUnattended()
    gUnattended = True
    On Error Resume Next
    PrintAllTeams
    gUnattended = False
End Sub

Sub PrintAllTeams()

    Dim wsCover As Worksheet, wsLVI As Worksheet, ws As Worksheet
    Dim wsGloss As Worksheet, glossIdx As Long
    Dim t As Range, deck() As String, n As Long
    Dim savedTeam As Variant, savedCalc As XlCalculation
    Dim folder As String, fName As String, skip As Variant
    Dim done As Long

    skip = Array("LVI", "ExportFiles", "Team Colors", "Claude Log", _
                 "Macro Archive", "Change Log", "Duplicate Metrics")

    Set wsCover = ThisWorkbook.Worksheets("Cover Page")
    Set wsLVI = ThisWorkbook.Worksheets("LVI")
    savedTeam = wsCover.Range("K7").Value

    folder = OUT_FOLDER
    If Right$(folder, 1) <> "\" Then folder = folder & "\"
    If Len(Dir(folder, vbDirectory)) = 0 Then
        If Not gUnattended Then MsgBox "Folder not found:" & vbCrLf & folder, vbExclamation
        Exit Sub
    End If

    ' Glossary must physically sit last - export follows TAB ORDER
    For Each ws In ThisWorkbook.Worksheets
        If InStr(1, ws.Name, "Glossary", vbTextCompare) > 0 Then
            Set wsGloss = ws
            Exit For
        End If
    Next ws
    If Not wsGloss Is Nothing Then
        glossIdx = wsGloss.Index
        wsGloss.Move After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count)
    End If

    ReDim deck(1 To ThisWorkbook.Worksheets.Count)
    For Each ws In ThisWorkbook.Worksheets
        If ws.Visible = xlSheetVisible Then
            If Len(ws.PageSetup.PrintArea) > 0 Then
                If IsError(Application.Match(ws.Name, skip, 0)) Then
                    n = n + 1
                    deck(n) = ws.Name
                End If
            End If
        End If
    Next ws
    ReDim Preserve deck(1 To n)

    savedCalc = Application.Calculation
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.Calculation = xlCalculationManual
    Application.EnableEvents = False       ' <-- FIX: K7 no longer self-fires the theme
    gSilent = True                         ' <-- mutes ApplyTeamTheme's MsgBox

    On Error GoTo CleanUp

    For Each t In wsLVI.Range("E2:E33")
        If Len(Trim$(t.Value)) > 0 Then

            wsCover.Range("K7").Value = t.Value

            Application.Calculate
            Do While Application.CalculationState <> xlDone
                DoEvents
            Loop

            Rem FIX: UpdateTeamLogo lives in the Cover Page sheet module, which
            Rem Application.Run cannot reach by bare name - the call always failed
            Rem and On Error Resume Next hid it. SetCoverWatermark inside
            Rem ApplyTeamTheme already handles the cover logo.
            Application.Run "ApplyTeamTheme"

            fName = folder & Scrub(CStr(t.Value)) & " - " & _
                    wsCover.Range("K15").Value & " Wk" & _
                    wsCover.Range("K11").Value & ".pdf"

            ThisWorkbook.Sheets(deck).Select
            ActiveSheet.ExportAsFixedFormat _
                Type:=xlTypePDF, Filename:=fName, _
                Quality:=xlQualityStandard, IncludeDocProperties:=True, _
                IgnorePrintAreas:=False, OpenAfterPublish:=False

            done = done + 1
            Application.StatusBar = "Printed " & done & " of 32 - " & t.Value
        End If
    Next t

CleanUp:
    If Err.Number <> 0 Then
        If Not gUnattended Then MsgBox "Stopped on " & t.Value & vbCrLf & Err.Description, vbCritical
    End If

    gSilent = False
    Application.EnableEvents = True
    If Not wsGloss Is Nothing Then
        wsGloss.Move Before:=ThisWorkbook.Sheets(glossIdx)
    End If

    wsCover.Select
    wsCover.Range("K7").Value = savedTeam
    Application.Calculate

    Application.Calculation = savedCalc
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Application.StatusBar = False

    If Err.Number = 0 Then
        If Not gUnattended Then MsgBox done & " reports written (" & n & " pages each) to:" & _
               vbCrLf & folder, vbInformation
    End If
End Sub

Private Function Scrub(s As String) As String
    Dim bad As Variant, i As Long
    bad = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For i = LBound(bad) To UBound(bad)
        s = Replace(s, bad(i), "")
    Next i
    Scrub = Trim$(s)
End Function

