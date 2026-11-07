; IMPOSTOR – instalator dla Windows (NSIS). Budowanie: npm run build:installer
Target amd64-unicode
!include "MUI2.nsh"

!define APPNAME "IMPOSTOR"
!define APPVERSION "1.0.0"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\IMPOSTOR"

Name "${APPNAME}"
OutFile "..\dist\IMPOSTOR-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\IMPOSTOR"
InstallDirRegKey HKCU "Software\IMPOSTOR" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "IMPOSTOR ${APPVERSION}"

VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1045 "ProductName" "IMPOSTOR"
VIAddVersionKey /LANG=1045 "FileDescription" "Instalator gry IMPOSTOR"
VIAddVersionKey /LANG=1045 "FileVersion" "${APPVERSION}"
VIAddVersionKey /LANG=1045 "ProductVersion" "${APPVERSION}"
VIAddVersionKey /LANG=1045 "CompanyName" "IMPOSTOR"
VIAddVersionKey /LANG=1045 "LegalCopyright" "IMPOSTOR"

!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Witaj w instalatorze gry IMPOSTOR"
!define MUI_WELCOMEPAGE_TEXT "IMPOSTOR to gra towarzyska w skojarzenia: wszyscy znają tajne słowo – oprócz Impostora.$\r$\n$\r$\nInstalator doda grę do menu Start i na pulpit. Nie są potrzebne uprawnienia administratora.$\r$\n$\r$\nKliknij Dalej, aby kontynuować."
!define MUI_FINISHPAGE_RUN "$INSTDIR\IMPOSTOR.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Uruchom IMPOSTOR"
!define MUI_FINISHPAGE_TITLE "Gotowe!"
!define MUI_FINISHPAGE_TEXT "Gra IMPOSTOR została zainstalowana. Uruchomisz ją ikoną na pulpicie lub z menu Start.$\r$\n$\r$\nGdy zapora Windows zapyta o dostęp, zezwól na sieci prywatne – wtedy znajomi zagrają online na swoich telefonach przez Wi-Fi."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Polish"

Section "IMPOSTOR" SecMain
  SectionIn RO
  nsExec::Exec 'taskkill /F /IM IMPOSTOR.exe'
  Sleep 500
  SetOutPath "$INSTDIR"
  File "..\dist\IMPOSTOR.exe"
  File "/oname=IMPOSTOR.ico" "build\icon.ico"
  WriteUninstaller "$INSTDIR\Odinstaluj.exe"

  CreateShortcut "$DESKTOP\IMPOSTOR.lnk" "$INSTDIR\IMPOSTOR.exe" "" "$INSTDIR\IMPOSTOR.exe" 0 SW_SHOWNORMAL "" "Gra w skojarzenia IMPOSTOR"
  CreateDirectory "$SMPROGRAMS\IMPOSTOR"
  CreateShortcut "$SMPROGRAMS\IMPOSTOR\IMPOSTOR.lnk" "$INSTDIR\IMPOSTOR.exe" "" "$INSTDIR\IMPOSTOR.exe" 0 SW_SHOWNORMAL "" "Gra w skojarzenia IMPOSTOR"
  CreateShortcut "$SMPROGRAMS\IMPOSTOR\Odinstaluj IMPOSTOR.lnk" "$INSTDIR\Odinstaluj.exe"

  WriteRegStr HKCU "Software\IMPOSTOR" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "IMPOSTOR – gra w skojarzenia"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${APPVERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "IMPOSTOR"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\IMPOSTOR.exe"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Odinstaluj.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" 87000
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM IMPOSTOR.exe'
  Sleep 500
  Delete "$INSTDIR\IMPOSTOR.exe"
  Delete "$INSTDIR\IMPOSTOR.ico"
  Delete "$INSTDIR\Odinstaluj.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\IMPOSTOR.lnk"
  Delete "$SMPROGRAMS\IMPOSTOR\IMPOSTOR.lnk"
  Delete "$SMPROGRAMS\IMPOSTOR\Odinstaluj IMPOSTOR.lnk"
  RMDir "$SMPROGRAMS\IMPOSTOR"
  DeleteRegKey HKCU "${UNINSTKEY}"
  DeleteRegKey HKCU "Software\IMPOSTOR"
  ; Statystyki i ranking (folder %APPDATA%\IMPOSTOR) zostają – przydadzą się po ponownej instalacji.
SectionEnd
