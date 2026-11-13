Attribute VB_Name = "Module1"
   Public gSilent As Boolean
   Rem FIX Nov-2026: remember the caller's calculation/event state instead of
   Rem forcing Automatic back on, which was defeating PrintAllTeams.
   Private mPrevCalc As XlCalculation
   Private mPrevEvents As Boolean
Sub ApplyTeamTheme()

    Dim wsT As Worksheet, ws As Worksheet
    Dim teamName As String, logoPath As String
    Dim newBand As Long, newHdr As Long, newFont As Long, newAcc As Long
    Dim bandSet As Object, hdrSet As Object, accSet As Object
    Dim cel As Range
    Dim doAccent As Boolean
    Dim hit As Long
                            
    On Error GoTo Fail
                            
    Set wsT = ThisWorkbook.Worksheets("Team Colors")
    teamName = CStr(ThisWorkbook.Worksheets("Cover Page").Range("K7").Value)
                            
    If CStr(wsT.Range("J12").Value) = "-" Then
        If Not gSilent Then MsgBox "Team not found on the Team Colors tab: " & teamName
        Exit Sub
    End If
                            
    newBand = HexToLong(wsT.Range("J19").Value)
    newHdr = HexToLong(wsT.Range("J20").Value)
    newFont = HexToLong(wsT.Range("J21").Value)
    newAcc = HexToLong(wsT.Range("J22").Value)
    doAccent = (UCase$(Trim$(CStr(wsT.Range("J7").Value))) = "YES")
    logoPath = CStr(wsT.Range("J26").Value)
                            
    Rem STATELESS MATCHING. The old version only swapped the one colour
    Rem recorded in J3/J4. The moment that record drifted from what was
    Rem actually on the page, every later run matched nothing and silently
    Rem did nothing. We now match against all 32 teams plus the two legacy
    Rem schemes, so a repaint works from whatever state the book is in.
    Set bandSet = BuildSet(wsT, 3, CDbl(wsT.Range("J18").Value), False)
    Set hdrSet = BuildSet(wsT, 3, CDbl(wsT.Range("J18").Value), True)
    Set accSet = BuildSet(wsT, 4, CDbl(wsT.Range("J18").Value), False)
    AddKey bandSet, HexToLong("#3B3F45")
    AddKey bandSet, HexToLong("#4F4F4F")
    AddKey hdrSet, HexToLong("#D9E1F2")
    AddKey hdrSet, HexToLong("#DCDCDC")
                            
    mPrevCalc = Application.Calculation
    mPrevEvents = Application.EnableEvents
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.Calculation = xlCalculationManual
                            
    For Each ws In ThisWorkbook.Worksheets
        If Not IsAdminSheet(ws.Name) Then
            For Each cel In ws.UsedRange
                Select Case True
                    Case bandSet.Exists(cel.Interior.Color)
                        cel.Interior.Color = newBand
                        cel.Font.Color = newFont
                        hit = hit + 1
                    Case hdrSet.Exists(cel.Interior.Color)
                        cel.Interior.Color = newHdr
                        hit = hit + 1
                    Case doAccent And accSet.Exists(cel.Interior.Color)
                        cel.Interior.Color = newAcc
                        hit = hit + 1
                End Select
            Next cel
            SetWatermark ws, logoPath, wsT
            PlaceMatchupLogos ws, wsT
        End If
    Next ws
                            
    SetCoverWatermark wsT, logoPath
                            
done:
    wsT.Range("J2").Value = teamName
    wsT.Range("J3").Value = wsT.Range("J19").Value
    wsT.Range("J4").Value = wsT.Range("J20").Value
    wsT.Range("J5").Value = wsT.Range("J21").Value
    If mPrevCalc = 0 Then mPrevCalc = xlCalculationAutomatic
    Application.Calculation = mPrevCalc
    Application.EnableEvents = mPrevEvents
    Application.ScreenUpdating = True
    If Not gSilent Then MsgBox "Theme applied for " & teamName & "  —  " & hit & " cells repainted."
    Exit Sub
                            
Fail:
    Rem Never leave events switched off. That is what killed the old macro:
    Rem one error and the Cover Page dropdown stopped firing until restart.
    If mPrevCalc = 0 Then mPrevCalc = xlCalculationAutomatic
    Application.Calculation = mPrevCalc
    Application.EnableEvents = mPrevEvents
    Application.ScreenUpdating = True
    If Not gSilent Then MsgBox "ApplyTeamTheme stopped on: " & Err.Description & vbCrLf & _
           "Events have been switched back on, so the Cover Page dropdown still works."
End Sub
                            
                            
Rem ---------------------------------------------------------------
Rem Build a lookup of every colour we are allowed to overwrite.
Rem col 3 = primary, col 4 = secondary. asTint = the light header tint.
Rem ---------------------------------------------------------------
Private Function BuildSet(wsT As Worksheet, col As Long, tint As Double, asTint As Boolean) As Object
    Dim d As Object, i As Long, h As String
    Set d = CreateObject("Scripting.Dictionary")
    For i = 2 To 33
        h = CStr(wsT.Cells(i, col).Value)
        If Len(h) = 7 Then
            If asTint Then
                AddKey d, TintLong(h, tint)
            Else
                AddKey d, HexToLong(h)
            End If
        End If
    Next i
    Set BuildSet = d
End Function
                            
Rem Pure black and pure white are never claimed by the theme — too many
Rem grids, borders and blank cells use them.
Private Sub AddKey(d As Object, c As Long)
    If c = RGB(0, 0, 0) Then Exit Sub
    If c = RGB(255, 255, 255) Then Exit Sub
    If Not d.Exists(c) Then d.Add c, 1
End Sub
                            
Rem Same maths as the J20 formula, so the macro and the sheet agree.
Private Function TintLong(ByVal h As String, ByVal t As Double) As Long
    Dim r As Long, g As Long, b As Long
    h = Replace(h, "#", "")
    r = CLng("&H" & Mid$(h, 1, 2))
    g = CLng("&H" & Mid$(h, 3, 2))
    b = CLng("&H" & Mid$(h, 5, 2))
    TintLong = RGB(Round(255 - (255 - r) * t, 0), _
                   Round(255 - (255 - g) * t, 0), _
                   Round(255 - (255 - b) * t, 0))
End Function
                            
Rem ---------------------------------------------------------------
Rem Faded logo in the centre page header. Sits BEHIND the cell content,
Rem never blocks cell selection, and prints / PDFs.
Rem ColorType is msoPictureAutomatic, NOT msoPictureWatermark. The
Rem Watermark preset crushes the tonal range before brightness and
Rem contrast are applied, which is what flattened the Titans mark into
Rem a plain red circle. Brightness / contrast alone do the fade and
Rem keep the hues apart.
Rem ---------------------------------------------------------------
Private Sub SetWatermark(ws As Worksheet, logoPath As String, wsT As Worksheet)
    If Len(logoPath) = 0 Then Exit Sub
    If Dir(logoPath) = "" Then Exit Sub
    With ws.PageSetup
        .HeaderMargin = wsT.Range("J30").Value
        .CenterHeader = "&G"
        With .CenterHeaderPicture
            .Filename = logoPath
            .LockAspectRatio = msoTrue
            .Height = wsT.Range("J29").Value
            .ColorType = msoPictureAutomatic
            .Brightness = WMBrightness(wsT)
            .Contrast = WMContrast(wsT)
        End With
    End With
End Sub
                            
Rem Per-team washout overrides live in columns L and M. Blank = default.
Private Function WMBrightness(wsT As Worksheet) As Double
    Dim r As Long
    r = TeamRow(wsT)
    If r > 0 Then
        If IsNumeric(wsT.Cells(r, 12).Value) And CStr(wsT.Cells(r, 12).Value) <> "" Then
            WMBrightness = CDbl(wsT.Cells(r, 12).Value)
            Exit Function
        End If
    End If
    WMBrightness = CDbl(wsT.Range("J27").Value)
End Function
                            
Private Function WMContrast(wsT As Worksheet) As Double
    Dim r As Long
    r = TeamRow(wsT)
    If r > 0 Then
        If IsNumeric(wsT.Cells(r, 13).Value) And CStr(wsT.Cells(r, 13).Value) <> "" Then
            WMContrast = CDbl(wsT.Cells(r, 13).Value)
            Exit Function
        End If
    End If
    WMContrast = CDbl(wsT.Range("J28").Value)
End Function
                            
Private Function TeamRow(wsT As Worksheet) As Long
    Dim f As Range
    Set f = wsT.Range("A2:A33").Find(What:=CStr(wsT.Range("J11").Value), LookAt:=xlWhole)
    If f Is Nothing Then TeamRow = 0 Else TeamRow = f.Row
End Function
                            
                            
Rem ---------------------------------------------------------------
Rem Cover Page. Uses the SAME page-header watermark as every other tab,
Rem so the logo sits BEHIND the table of contents instead of on top of
Rem it. A floating picture cannot do that — Excel always draws shapes
Rem above cell text — which is why the first attempt covered the list.
Rem The header is centred horizontally by Excel itself; J39 pushes it
Rem down the page and J38 sizes it. Visible in Page Layout view, Print
Rem Preview and PDF, exactly like the report pages.
Rem ---------------------------------------------------------------
Private Sub SetCoverWatermark(wsT As Worksheet, logoPath As String)
    Dim ws As Worksheet
    Dim i As Long
    Set ws = ThisWorkbook.Worksheets("Cover Page")
                            
    Rem Clear out the old floating-picture version if it is still present.
    For i = ws.Shapes.Count To 1 Step -1
        If ws.Shapes(i).Name = "TeamLogoCover" Then ws.Shapes(i).Delete
    Next i
                            
    If UCase$(Trim$(CStr(wsT.Range("J37").Value))) <> "YES" Then
        ws.PageSetup.CenterHeader = ""
        Exit Sub
    End If
    If Len(logoPath) = 0 Then Exit Sub
    If Dir(logoPath) = "" Then Exit Sub
                            
    With ws.PageSetup
        .HeaderMargin = wsT.Range("J39").Value
        .CenterHeader = "&G"
        With .CenterHeaderPicture
            .Filename = logoPath
            .LockAspectRatio = msoTrue
            .Height = wsT.Range("J38").Value
            .ColorType = msoPictureAutomatic
            .Brightness = WMBrightness(wsT)
            .Contrast = WMContrast(wsT)
        End With
    End With
End Sub
Rem ---------------------------------------------------------------
Rem Opponent logo only, top right of each week page. Our own team is
Rem already the background watermark there. Opponent is read from BH27.
Rem ---------------------------------------------------------------
Private Sub PlaceMatchupLogos(ws As Worksheet, wsT As Worksheet)
    Dim oppAbbr As String, pOpp As String
    Dim folder As String, pattern As String
    Dim h As Single, gap As Single
    Dim anchor As Range
    Dim i As Long
                            
    If Not IsMatchupSheet(ws.Name) Then Exit Sub
                            
    For i = ws.Shapes.Count To 1 Step -1
        If Left$(ws.Shapes(i).Name, 8) = "TeamLogo" Then ws.Shapes(i).Delete
    Next i
                            
    oppAbbr = LookupAbbr(ws.Range("BH27").Value)
    If Len(oppAbbr) = 0 Then Exit Sub
                            
    folder = CStr(wsT.Range("J24").Value)
    pattern = CStr(wsT.Range("J25").Value)
    h = wsT.Range("J32").Value
    gap = wsT.Range("J34").Value
    On Error Resume Next
    Set anchor = ws.Range(CStr(wsT.Range("J33").Value))
    On Error GoTo 0
    If anchor Is Nothing Then Exit Sub
                            
    pOpp = folder & Replace(pattern, "{ABBR}", oppAbbr)
    AddLogo ws, pOpp, anchor.Left + h + gap, anchor.Top, h, "TeamLogoOpp"
End Sub
                            
Private Sub AddLogo(ws As Worksheet, path As String, l As Single, t As Single, h As Single, nm As String)
    Dim p As Shape
    If Dir(path) = "" Then Exit Sub
    Set p = ws.Shapes.AddPicture(path, msoFalse, msoCTrue, l, t, -1, -1)
    p.LockAspectRatio = msoTrue
    p.Height = h
    p.Name = nm
    p.Placement = xlFreeFloating
End Sub
                            
Rem Full team name -> the abbreviation in column B of this tab.
Private Function LookupAbbr(teamName As Variant) As String
    Dim wsT As Worksheet, f As Range
    Set wsT = ThisWorkbook.Worksheets("Team Colors")
    Set f = wsT.Range("A2:A33").Find(What:=CStr(teamName), LookAt:=xlWhole)
    If f Is Nothing Then
        LookupAbbr = ""
    Else
        LookupAbbr = CStr(wsT.Cells(f.Row, 2).Value)
    End If
End Function
                            
Rem Pages that show an opponent logo.
Private Function IsMatchupSheet(nm As String) As Boolean
    If Left$(nm, 5) = "Week " Then IsMatchupSheet = True
    If nm = "Current Week Matchup" Then IsMatchupSheet = True
End Function
                            
Rem Driver and admin tabs are never recoloured or watermarked.
Rem The Cover Page is listed here so its layout is left alone — it still
Rem gets its own logo through SetCoverWatermark.
Private Function IsAdminSheet(nm As String) As Boolean
    Select Case nm
        Case "Cover Page", "Team Colors", "ExportFiles", "LVI", _
             "Change Log", "Claude Log", "Duplicate Metrics", _
             "Glossary & Acknowledgements", _
             "dataarchive", "Macro Archive", "Audit Report", "Schedule"
            IsAdminSheet = True
    End Select
End Function
                            
Private Function HexToLong(ByVal h As String) As Long
    h = Replace(h, "#", "")
    HexToLong = RGB(CLng("&H" & Mid$(h, 1, 2)), _
                    CLng("&H" & Mid$(h, 3, 2)), _
                    CLng("&H" & Mid$(h, 5, 2)))
End Function
                            
Rem ---------------------------------------------------------------
Rem Swatch sync. Columns F and G on this sheet are painted samples of
Rem each team's primary and secondary. The hex TEXT in columns C and D
Rem is what actually drives the theme. These two routines copy one into
Rem the other, so you can work whichever way you prefer. NEITHER runs
Rem automatically - pick one from Alt+F8 - so a stale swatch can never
Rem silently overwrite a hex value you typed, or the other way round.
Rem ---------------------------------------------------------------
Public Sub SyncSwatchesToHex()
    Rem Paint F and/or G by hand, then run this to update C and D.
    Dim wsT As Worksheet
    Dim i As Long, n As Long
    Dim msg As String, newHex As String
    Set wsT = ThisWorkbook.Worksheets("Team Colors")
    For i = 2 To 33
        If wsT.Cells(i, 6).Interior.ColorIndex <> xlNone Then
            newHex = LongToHex(wsT.Cells(i, 6).Interior.Color)
            If newHex <> UCase$(Trim$(CStr(wsT.Cells(i, 3).Value))) Then
                msg = msg & wsT.Cells(i, 2).Value & "  primary    " & _
                      wsT.Cells(i, 3).Value & " -> " & newHex & vbCrLf
                wsT.Cells(i, 3).Value = newHex
                n = n + 1
            End If
        End If
        If wsT.Cells(i, 7).Interior.ColorIndex <> xlNone Then
            newHex = LongToHex(wsT.Cells(i, 7).Interior.Color)
            If newHex <> UCase$(Trim$(CStr(wsT.Cells(i, 4).Value))) Then
                msg = msg & wsT.Cells(i, 2).Value & "  secondary  " & _
                      wsT.Cells(i, 4).Value & " -> " & newHex & vbCrLf
                wsT.Cells(i, 4).Value = newHex
                n = n + 1
            End If
        End If
    Next i
    If n = 0 Then
        MsgBox "Swatches and hex values already agree. Nothing changed."
    Else
        MsgBox n & " value(s) read off the swatches:" & vbCrLf & vbCrLf & msg & _
               vbCrLf & "Now re-select the team in Cover Page K7 to repaint."
    End If
End Sub
                            
Public Sub SyncHexToSwatches()
    Rem Type hex into C and/or D, then run this to repaint F and G.
    Dim wsT As Worksheet
    Dim i As Long
    Set wsT = ThisWorkbook.Worksheets("Team Colors")
    For i = 2 To 33
        If Len(Trim$(CStr(wsT.Cells(i, 3).Value))) = 7 Then
            wsT.Cells(i, 6).Interior.Color = HexToLong(CStr(wsT.Cells(i, 3).Value))
        End If
        If Len(Trim$(CStr(wsT.Cells(i, 4).Value))) = 7 Then
            wsT.Cells(i, 7).Interior.Color = HexToLong(CStr(wsT.Cells(i, 4).Value))
        End If
    Next i
    MsgBox "Swatches in F and G repainted from the hex in C and D."
End Sub
                            
Rem Interior.Color is a BGR-ordered Long, so the bytes come back in
Rem reverse order and have to be reassembled as #RRGGBB.
Private Function LongToHex(ByVal c As Long) As String
    LongToHex = "#" & Right$("0" & Hex$(c Mod 256), 2) & _
                      Right$("0" & Hex$((c \ 256) Mod 256), 2) & _
                      Right$("0" & Hex$((c \ 65536) Mod 256), 2)
End Function


