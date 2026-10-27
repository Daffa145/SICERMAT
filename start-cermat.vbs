' ==============================================================================
' CERMAT Background Service Launcher (Silent / Invisible)
' Menjalankan server CERMAT di latar belakang tanpa jendela CMD
' ==============================================================================
Option Explicit

Dim WshShell, fso, currentDir, serverJs, logFile, cmd, http

' Periksa apakah port 3000 sudah aktif
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.open "GET", "http://127.0.0.1:3000/api/health", False
http.setTimeouts 1000, 1000, 1000, 1000
http.send

If Err.Number = 0 Then
    If http.status = 200 Then
        ' Sudah berjalan, tidak perlu spawn ulang
        Set http = Nothing
        WScript.Quit 0
    End If
End If
Err.Clear
On Error GoTo 0

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverJs = currentDir & "\server.js"
logFile = currentDir & "\data\service.log"

WshShell.CurrentDirectory = currentDir

' Jalankan server.js secara tersembunyi (0 = hidden window, False = jangan tunggu selesai)
cmd = "cmd.exe /c node """ & serverJs & """ >> """ & logFile & """ 2>&1"
WshShell.Run cmd, 0, False

Set WshShell = Nothing
Set fso = Nothing
Set http = Nothing
