# Project Context: Palmiye Label Management System (PLMS)

## Overview
PLMS is a web-based label management and printing system ensuring strict adherence to standardized layouts, data integrity, and centralized printable output. 

## High-Level Goals
- Replace scattered, ad-hoc label printing with a governed, centralized platform.
- Integrate directly with Microsoft Entra ID for SSO and RBAC.
- Decouple the label design (Canonical JSON) from data (Products).
- Maintain an undisputed source of truth through a single server-rendered PDF pipeline.

## MVP Boundaries (Must Read)
1. **Hardware:** Epson ColorWorks CW-C4000e ONLY.
2. **Exclusions:** NO QZ Tray, NO Zebra, NO ZPL.
3. **Print Pipeline:** Next.js UI -> .NET 8 API -> PDF Blob -> Browser Print Dialog.
4. **Editor:** Functional MVP. No auto layout or nested group madness.

## Architecture References
- [System Overview](architecture/overview.md)
- [API Contracts](architecture/api-contracts.md)
- [Epson Print Flow](architecture/print-flow-epson-only.md)
- [Canonical Label Model](architecture/canonical-label-model.md)

## Operations Guides
- [Deployment Strategy](operations/deployment.md)
- [Testing Strategy](operations/testing-strategy.md)
- [Risk Register](operations/risk-register.md)
- [Local Development](operations/local-development.md)
