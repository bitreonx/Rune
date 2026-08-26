# RUNE upstream identity audit

RUNE is a direct fork of T3 Code. The baseline snapshot is commit `e529ded`. This audit records inherited identifiers that should not be confused with RUNE branding or infrastructure.

## Must remain

- The upstream MIT copyright notice for T3 Tools Inc. and the MIT permission text in [`LICENSE`](./LICENSE).
- Third-party package and native-component notices required by their licenses.
- Provider names and provider-owned URLs where they identify the external tool a user must install or authenticate.
- Compatibility identifiers that are part of stored data, migration logic, protocol handling, or an external provider contract until a deliberate migration exists.

## Must be renamed or replaced

- User-facing product copy must say RUNE, not T3 Code.
- RUNE repository, release, issue, discussion, and support links must use the RUNE repository and official RUNE destinations.
- Application names, icons, package names, bundle identifiers, protocol identities, updater configuration, and analytics identifiers must identify RUNE releases, not upstream releases.
- Upstream mobile store listings and app IDs must not be presented as RUNE downloads. Mobile is not officially distributed yet.

## Review manually

- `apps/marketing` and release scripts still contain repository/release references that need a separate infrastructure migration review before changing them globally. Changing them affects update manifests, publishing, website links, and signed artifacts.
- `packaging/aur` retains inherited package-directory names and should be migrated only together with package-manager ownership and upgrade-path decisions.
- Internal compatibility names such as legacy `t3` project files, native-module paths, and stored state keys may affect existing users and should be changed only with migrations and tests.
- Test fixtures may intentionally use old names to prove migration or compatibility behavior; do not rename them merely to make a grep clean.

This document is deliberately descriptive. It does not claim that every inherited identifier is safe to expose publicly; it identifies where a maintainer should make the change with evidence and a migration plan.
