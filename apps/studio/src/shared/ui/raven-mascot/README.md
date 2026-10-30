# Raven mascot

Import `RavenMascot` and its types from `@/shared/ui/raven-mascot`.

- `state`: `idle` (breathing and blinking), `observing` (slow head movements), or `curious` (head tilt and subtle wing movement). Defaults to `idle`.
- `animated`: set to `false` for a static character. Defaults to `true`. The system reduced-motion preference always disables animation.
- `className`: Tailwind sizing/placement utilities. Defaults to `size-32`.
- `label`: optional accessible description. Without a label the mascot is decorative and hidden from assistive technology.

Animated states include breathing, blinking, tail movement, and occasional posture adjustments. Only `observing` moves the pupil, with brief, bounded shifts and sustained pauses coordinated with its head/blink cycle. Idle and curious pupils keep a steady gaze. The eye uses a fixed blink pivot and a per-instance SVG clip to keep the pupil inside its aperture. Animations depend only on the `state` and `animated` props; pointer movement and hover never change or restart them. `animated={false}` disables all sequences. The wing shares the body color and uses a fine feather contour rather than a contrasting interior fill.

The SVG uses semantic theme colors. CSS owns the animation states; there are no JavaScript timers, runtime subscriptions, or animation dependencies. States are presentation choices and do not imply simulation activity or findings. Adding a visual state requires extending `RavenState` and the scoped CSS selectors. Keep animations restrained and support the static state.
