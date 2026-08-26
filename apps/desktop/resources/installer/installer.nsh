; Custom RUNE Installer Script - Modern, Branded Windows Installer
; This script provides a beautiful, professional installation experience

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Custom defines for branding
!define RUNE_BRAND_NAME "RUNE"
!define RUNE_BRAND_DESCRIPTION "AI-powered development environment"
!define RUNE_BRAND_COMPANY "RUNE"
; electron-builder supplies the staged RUNE icon through installerIcon and
; uninstallerIcon. Do not override those with stock NSIS artwork here.

; Modern UI Configuration - Custom Colors & Branding
!define MUI_BGCOLOR "0x020204"
!define MUI_TEXTCOLOR "0xFFFFFF"

; Custom Welcome & Finish Pages
; Electron Builder supplies the welcome bitmap macros for the generated NSIS
; template. Keep those resources intact instead of redefining them here.

; Welcome page customization
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${RUNE_BRAND_NAME} Setup"
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of ${RUNE_BRAND_NAME}.$\r$\n$\r$\n${RUNE_BRAND_DESCRIPTION}$\r$\n$\r$\nClick Next to continue."

; Finish page customization  
!define MUI_FINISHPAGE_TITLE "${RUNE_BRAND_NAME} Installation Complete"
!define MUI_FINISHPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TEXT "${RUNE_BRAND_NAME} has been successfully installed.$\r$\n$\r$\nClick Finish to close this wizard."
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_LINK "Visit RUNE website"
!define MUI_FINISHPAGE_LINK_LOCATION "https://rune.codes"

; Component page configuration
!define MUI_COMPONENTSPAGE_NODESC

; Directory page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Setup will install ${RUNE_BRAND_NAME} in the following folder. To install in a different folder, click Browse and select another folder."

; Installation progress
!define MUI_INSTFILESPAGE_COLORS "020204 8B5CF6"
!define MUI_INSTFILESPAGE_PROGRESSBAR "smooth"

; Abort warning
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Are you sure you want to quit ${RUNE_BRAND_NAME} Setup?"

; Uninstaller
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Setup will uninstall ${RUNE_BRAND_NAME} from your computer."

; Custom functions for better UX
Function .onInit
    ; Check if already installed
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${RUNE_BRAND_NAME}" "UninstallString"
    StrCmp $R0 "" done
    
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
    "${RUNE_BRAND_NAME} is already installed. $\n$\nClick 'OK' to remove the previous version or 'Cancel' to cancel this installation." \
    IDOK uninst
    Abort
    
uninst:
    ClearErrors
    ExecWait '$R0 _?=$INSTDIR'
    
done:
FunctionEnd

Function LaunchApplication
    Exec "$INSTDIR\${APP_PRODUCT_FILENAME}.exe"
FunctionEnd

; Custom page to show installation progress with style
Function CustomInstallProgress
    DetailPrint "Installing ${RUNE_BRAND_NAME}..."
    DetailPrint "Setting up application files..."
FunctionEnd

; Clean up old versions
Function CleanOldVersions
    DetailPrint "Cleaning up previous installations..."
    ; Add any custom cleanup here
FunctionEnd

; Post-install configuration
Function PostInstall
    DetailPrint "Configuring ${RUNE_BRAND_NAME}..."
    DetailPrint "Creating shortcuts..."
    DetailPrint "Registering file associations..."
FunctionEnd

; Custom messages for user
!define MUI_TEXT_INSTALLING_TITLE "Installing ${RUNE_BRAND_NAME}"
!define MUI_TEXT_INSTALLING_SUBTITLE "Please wait while ${RUNE_BRAND_NAME} is being installed."
!define MUI_TEXT_FINISH_TITLE "Installation Complete"
!define MUI_TEXT_FINISH_SUBTITLE "${RUNE_BRAND_NAME} has been successfully installed on your computer."
!define MUI_TEXT_ABORT_TITLE "Installation Aborted"
!define MUI_TEXT_ABORT_SUBTITLE "Setup was not completed successfully."

; Installer will be smooth and modern
XPStyle on
RequestExecutionLevel admin
ShowInstDetails show
ShowUnInstDetails show
SetCompressor /SOLID lzma
SetCompressorDictSize 64
SetDatablockOptimize on

; Better progress display
AutoCloseWindow false
SilentInstall normal

; Custom branding text at bottom
BrandingText "${RUNE_BRAND_NAME} Installer"

; Smooth visual experience - no ugly flashing
SetOverwrite on
AllowSkipFiles off
