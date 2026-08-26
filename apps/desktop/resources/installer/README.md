# RUNE Windows Installer Assets

This directory contains custom NSIS installer configuration for a branded, professional Windows installation experience.

## Files

### installer.nsh

Custom NSIS script that provides:

- Modern UI with RUNE branding
- Smooth installation progress with custom colors
- Desktop & Start Menu shortcuts
- Custom welcome and finish pages
- Clean uninstallation support
- Launch option after installation
- Version checking and upgrade handling

### LICENSE.txt

License agreement shown during installation.

### Installer artwork

The installer uses the staged RUNE Windows icon and branded text/colors. No
stock NSIS artwork is referenced, and placeholder bitmap files are not used.

## Configuration

The installer is configured in `scripts/build-desktop-artifact.ts` with:

- **One-Click**: Disabled for better user control
- **Per-Machine**: Disabled (per-user installation by default)
- **Desktop Shortcut**: Enabled
- **Start Menu**: Enabled
- **Uninstall Data**: Preserves user data on uninstall
- **Custom Icons**: Uses the staged RUNE branded icon
- **Auto-Launch**: Optional launch after installation

## Customization

To modify the installer:

1. Edit `installer.nsh` for script changes
2. Update `LICENSE.txt` for license text
3. Replace bitmap files for visual customization
4. Modify `build-desktop-artifact.ts` for configuration

## Benefits Over Default Installer

✨ **Professional Appearance**

- Custom branding throughout installation
- Modern color scheme matching RUNE identity
- Smooth animations and progress indicators

🎯 **Better User Experience**

- Clear installation steps
- Option to launch immediately
- Smart version detection and upgrades
- Clean uninstallation

🚀 **Performance**

- LZMA compression for smaller download
- Optimized file operations
- Fast installation process

## Technical Details

- Uses NSIS (Nullsoft Scriptable Install System)
- Managed by electron-builder
- Supports differential updates
- Code signing ready
- Windows 10/11 compatible
