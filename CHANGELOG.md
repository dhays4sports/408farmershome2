## 408-ADDR-1E — Validation and Deployment Readiness

- Added address-autocomplete runtime regression tests.
- Added live deployment and Google API restriction checklist.
- Certified manual, autocomplete, timeout, structured capture, and stale-data clearing paths.


## 408-ADDR-1D — Manual Address Fallback

- Added submit-time canonicalization for manually typed addresses.
- Added paste handling, stale-component clearing, and Google loader timeout fallback.
- Added an `address:ready` integration event without changing the current form pipeline.

## 408-ADDR-1C — Structured Address Capture

- Added structured Google Places address component capture.
- Added hidden street, city, county, state, ZIP, country and place ID fields.
- Added explicit autocomplete/manual selection tracking.
- Clears stale structured values when a selected address is edited.

# Changelog

## 408-ADDR-1B — Smart Suggestion Interface

- Added a styled, touch-friendly Google Places suggestion dropdown.
- Added a three-character suggestion threshold and live address guidance.
- Added selected/loading/manual/unavailable UI states while preserving manual entry.
- Added keyboard and click-away dismissal support.

## Sprint 1.4C
- Production optimization and accessibility pass for the homepage.
- Added vendor-neutral analytics event hooks.
- Improved metadata, image loading, mobile behavior and navigation.

## Sprint 1.4B
- Added homepage storytelling, CoverageFit explanation, trust content and professional pathways.

## Sprint 1.4A
- Rebuilt the homepage as an intent-based routing hub.

- Sprint 1.5: Added campaign routing architecture documentation.

## B.1.2A — Shared CoverageFit Launcher
- Added the reusable sending-side CoverageFit launcher.
- Added attribution and UTM pass-through URL construction.
- Added shared integration session IDs.
- Added launch/fallback analytics events.
- Added configurable production and fallback destinations.
- No live CTA behavior changed in this sprint.

## B.1.2B — `/score` CoverageFit Handoff

- Connected all `/score` review CTAs to the shared CoverageFit launcher.
- Preserved campaign, UTM, referral, creative, and session attribution.
- Preserved the existing transition and mobile sticky CTA.
- Retained `/home#form` as the local fallback.

## B.1.2C — Additional Home Entry Points
- Connected the homepage primary Home review CTA and featured Home intent card to CoverageFit.
- Preserved Formspree lead capture on Home, Tech, Engineer, and Healthcare landers, then continued successful submissions into CoverageFit.
- Added distinct entry and launch-surface attribution for every connected path.
- Left Auto Bundle, Business, Landlord, Life, and non-Home routes unchanged.


## B.1.2D — End-to-End Integration QA

- Added repeatable launcher, static integration, route, and local-link QA tests.
- Verified all 408-FARMERS Home entry points preserve their intended funnel behavior.
- Confirmed campaign, UTM, session, entry, assessment, and launch-surface attribution.
- Confirmed safe local fallback behavior.
- Added `B1_2D_QA.json` and `SPRINT-B.1.2D.md`.

## B1.2F — Home Flyer-to-Web Journey Alignment
- Rebuilt `/home` hero to visually continue the printed 408FARMERS homeowner flyer.
- Added a full-width California home image, flyer-scale headline, increased whitespace, and one dominant above-the-fold CTA.
- Moved the full Coverage Review form below the hero to reduce first-screen friction.
- Added a concise review-benefits section and streamlined the Meet Dylan presentation.
- Updated campaign attribution copy to match the homeowner campaign message.
- Preserved CoverageFit launch, Formspree submission, UTM attribution, consent, and thank-you behavior.

## 408-ADDR-1A — Address Autocomplete Foundation

- Added optional Google Places loading for the `/home` property-address field.
- Restricted provider suggestions to US addresses and biased results toward California.
- Added resilient manual-entry fallback and duplicate-loader protection.
- Added `googlePlacesApiKey` configuration placeholder and sprint documentation.

## CF-INT-1A — Prospect Profile Builder
- Added `shared/prospect-profile.js` with canonical profile construction, normalization, storage, and retrieval.
- Home form now builds and stores the prospect profile after validation.
- CoverageFit launcher now accepts a profile object without serializing or transferring personal data.
- Added `coveragefit:profile-ready` integration event for future handoff sprints.


## CF-INT-1B — Intelligent Profile Handoff
- Added allowlisted prospect profile serialization to the CoverageFit launch URL.
- Transfers contact, review-context, and structured property-address data after successful lead capture.
- Added prefill and handoff-version markers while preserving existing attribution and fallback behavior.
