# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-04-06
### Added
- Comprehensive JSDoc documentation for backend API routes in `server.ts`.
- JSDoc documentation for main React components in `App.tsx`.
- `useFetch` custom hook for standardized data fetching.
- `StatCard` reusable component.
- `shared/constants.ts` for centralized configuration of ward types, rates, and doctors.
- `CHANGELOG.md` to track project evolution.

### Changed
- Refactored `Dashboard` component to use `useFetch` hook.
- Refactored `StatCard` into a separate component file.
- Replaced hardcoded values with shared constants across frontend and backend.
- Improved error handling and loading states in the Dashboard.

## [1.0.0] - 2026-04-05
### Added
- Initial release of MedTrack Hospital Bed Capacity Management System.
- Core features: Bed management, Patient admission, Discharge system, Billing, and History.
- Login system with master password support.
- Dashboard with real-time statistics and ward breakdown.
- Responsive UI built with React, Tailwind CSS, and Framer Motion.
- MongoDB integration for persistent data storage.
- Documentation: `README.md`, `CONTRIBUTING.md`, and `LICENSE`.
