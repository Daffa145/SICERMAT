' ==============================================================================
' Buka CERMAT - One Click Launcher (Silent)
' Menjalankan service (jika belum jalan) dan membuka jendela aplikasi CERMAT
' ==============================================================================
Option Explicit

Dim WshShell, fso, currentDir, edgePath, startVbs, http, i

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
startVbs = currentDir & "\start-cermat.vbs"

' Jalankan start-cermat.vbs (akan auto-check jika sudah jalan)
WshShell.Run "wscript.exe """ & startVbs & """", 0, False

' Tunggu sebentar sampai server siap (maksimal 5 detik)
For i = 1 To 10
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.open "GET", "http://127.0.0.1:3000/api/health", False
    http.setTimeouts 500, 500, 500, 500
    http.send
    If Err.Number = 0 Then
        If http.status = 200 Then
            Set http = Nothing
            Exit For
        End If
    End If
    Set http = Nothing
    Err.Clear
    On Error GoTo 0
    WScript.Sleep 500
Next

' Lokasi Microsoft Edge
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(edgePath) Then
    ' Buka dalam mode App Window (tanpa address bar, native window)
    WshShell.Run """" & edgePath & """ --app=http://localhost:3000", 1, False
Else
    ' Fallback ke default browser
    WshShell.Run "http://localhost:3000", 1, False
End If

Set WshShell = Nothing
Set fso = Nothing
