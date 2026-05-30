' smart slayt - terminal gizli baslatici (saglamlastirilmis)
' Sunucu calismiyorsa gizli baslatir (ciktiyi run.log'a yazar), sonra tarayicida acar.
Dim sh, fso, projDir, running, http
projDir = "C:\Users\umuti\Projects\smart_slayt"
Set sh = CreateObject("WScript.Shell")

running = False
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.open "GET", "http://localhost:5179/", False
http.send
If Err.Number = 0 And http.status = 200 Then running = True
On Error GoTo 0

If Not running Then
  sh.CurrentDirectory = projDir
  ' cmd /c ile calistir: cikti run.log'a, pencere gizli (0), beklemeden don
  sh.Run "cmd /c """"C:\Program Files\nodejs\node.exe"" server.js > """ & projDir & "\run.log"" 2>&1""", 0, False
  ' sunucunun ayaga kalkmasini bekle (en fazla ~12 sn)
  Dim i
  For i = 1 To 24
    WScript.Sleep 500
    On Error Resume Next
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.open "GET", "http://localhost:5179/", False
    http.send
    If Err.Number = 0 And http.status = 200 Then Exit For
    On Error GoTo 0
  Next
End If

sh.Run "http://localhost:5179/", 1, False
