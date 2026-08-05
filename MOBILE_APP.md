# Purple Rabbit mobile app

The website stays at `/purple`. The iOS and Android apps are generated from that same folder with Capacitor. There is no TikTok integration.

## First setup

```bash
npm install
npm run mobile:add
```

This creates local `android/` and `ios/` projects. They are generated files and are not part of the website deployment.

## After changing `/purple`

```bash
npm run mobile:sync
```

That command copies the current `/purple` source into the native apps. There is no second simulator codebase to maintain.

## Open the native projects

```bash
npm run mobile:android
npm run mobile:ios
```

Android opens in Android Studio. iOS opens in Xcode and requires a Mac for final App Store building and signing.

## Mobile behavior

The mobile build adds only a small build-time shell around the existing interface:

- full device viewport with safe-area support
- vertical page scrolling
- touch-friendly buttons and controls
- the existing one-finger simulator drag controls
- the same Purple Rabbit interface and functionality

The source website is not rewritten during this process.
