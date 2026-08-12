# Help center and onboarding

The in-product help center is one shared domain view for Next.js and Tauri. It
is intentionally searchable without a separate documentation backend while the
product is small; content changes ship with the application and remain versioned
with the behavior they describe.

## Code map

- `src/components/help/HelpCenterView.tsx`: searchable FAQ, quick actions and
  responsive presentation. It contains no platform navigation implementation.
- `src/components/help/AppHelpPage.tsx`: Next.js `Link` adapter.
- `src/app/(main)/help/page.tsx`: public route composition and metadata only.
- `desktop/src/help/DesktopHelp.tsx`: Tauri navigation adapter.
- `src/components/onboarding/OnboardingFlow.tsx`: first profile setup and the
  explicit post-setup destination choice.
- `src/lib/constants/nav.ts`: canonical shared navigation entry for `/help`.

## Content rules

- Explain the current product behavior, not planned features.
- Prefer a direct action and its exact UI label over generic advice.
- Security answers must never imply that support asks for login codes or tokens.
- Platform-specific troubleshooting must say whether it applies to web,
  Windows or both.
- Keep answers short enough to scan in the application. Long legal or technical
  material belongs in the appropriate legal page or developer documentation.

## Navigation contract

`HelpCenterView` receives a `renderDestination` adapter. Add links through that
adapter so web and desktop keep identical content without importing Next.js or
Tauri navigation into the shared component.

Onboarding honors an explicit safe `redirectAfter` first (for example, after an
invite). Otherwise the user chooses profile, people search or chats. Saving the
profile and mood completes before navigation.

## Release checks

- Search matches both question and answer and shows an empty result state.
- Every FAQ works with keyboard-only navigation.
- Quick actions use client navigation in both Next.js and Tauri.
- The page has no horizontal overflow at 360 px in light and dark themes.
- Anonymous users can read help, but the personalized onboarding route remains
  protected.
- Invite-driven onboarding keeps its original redirect instead of the selected
  default destination.
