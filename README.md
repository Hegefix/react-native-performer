# react-native-performer

Zero-config rerender detection and overlay for React Native. Built for the new architecture (Fabric + Hermes).

> **Status:** v0 work-in-progress. Not yet published to npm.

## Why

- **Zero instrumentation.** No HOC, no hook, no babel plugin at your call sites — attaches to React's internal commit hook and walks the fiber tree.
- **Visual feedback.** Paints a flash overlay on any component that rerendered, with color-coded frequency.
- **Built for RN.** `why-did-you-render` is web-first and logs to console. React DevTools Profiler is manual and off by default. `react-native-performer` is RN-first, always-on in dev, and visual.

## Requirements

- React Native with the **new architecture enabled** (Fabric)
- React `>=18`
- React Native `>=0.74`

Tested on Expo SDK 52+.

## Install

> TODO — not yet published.

```sh
npm install --save-dev react-native-performer
```

## Usage

> TODO — API in progress.

```ts
// index.js — must be the first import, before React renders and before any
// AppRegistry.setWrapperComponentProvider call.
import '@performer/devtools/auto';
```

`auto` attaches the commit hook and mounts the flash overlay and HUD above the app through
`AppRegistry.setWrapperComponentProvider` (dev only). A wrapper provider the app sets later is
composed, not replaced. For setups that don't go through AppRegistry, wrap the app manually:

```tsx
import { PerformerRoot } from '@performer/devtools';

<PerformerRoot>
  <App />
</PerformerRoot>
```

## Roadmap

- [ ] Commit hook attachment + fiber walk (probe validated)
- [ ] Prop diff attribution (which prop changed, reference vs value)
- [x] Host instance resolution (Fabric + Paper) + flash overlay
- [ ] Draggable HUD with top-N rerendering components
- [ ] Example Expo app demonstrating inline-object / missing-memo anti-patterns
- [ ] Opt-out filters (skip host components, skip navigation internals)
- [ ] Babel plugin for prod stripping

## License

MIT © Viktor Krasnohorskiy
