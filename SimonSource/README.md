# PHANTOM // SIGNAL — C# and Perl

**Source:** C# (Blazor WebAssembly). **Sound design:** Perl (procedurally synthesized WAVs).

The gameplay, timing, burst geometry, procedural smoke, round progression, hit targets, and rendering are implemented in **App.razor's C# code**. `make_sounds.pl` synthesizes eleven distinct sounds during the build.

The browser requires its normal HTML/CSS shell plus Microsoft's standard Blazor WebAssembly runtime. **No gameplay code is implemented in JavaScript.** GitHub Pages serves the compiled .NET WebAssembly application at `https://furiousacid.com/Simon/`.

## Build locally

With the .NET 8 SDK and Perl installed:

```sh
perl SimonSource/make_sounds.pl SimonSource/wwwroot/sounds
dotnet publish SimonSource/Simon.csproj --configuration Release --output simon-published
```

Host the generated `simon-published/wwwroot` folder at a path named `/Simon/`, or adjust `<base href="/Simon/">` if hosting elsewhere.

## Game

The screen starts dark and emits unpredictable colored starbursts, each with a distinctive Perl-generated impact sound. Every burst has a clear ignition, followed by lingering smoke. A green light sweep means it is the player's turn to tap the faint targets in the same order. The pattern goes from 2 to 3 to 4 lights; thereafter, smoke grows more persistent to increase visual interference. After round 16, it fades to complete darkness.

There is only a one-time photosensitivity warning and a late idle hint. Bright bursts may affect photosensitive people; sound and light intensity should be kept comfortable.

### Mobile audio note

Browser policies may restrict `<audio autoplay>` between taps on some mobile devices. This first C#-only prototype keeps audio playback in markup instead of adding an authored JavaScript bridge. If audio fails on a particular phone, the visual game remains playable.

### Publishing

The GitHub Actions workflow `.github/workflows/simon.yml` builds C# on GitHub-hosted runners, synthesizes WAVs with Perl, and commits the static published assets under `/Simon/` without replacing the rest of the website.

## October 24 mobile touch fix

The SVG stretches to the full device viewport instead of squeezing the hit targets into a letterboxed square. Faint targets now have much larger invisible finger-sized touch regions, with clearer visible rings. The green handoff sweep is brighter, and the number of concurrently rendered colored-smoke particles is capped for smoother mobile performance. A single quiet glowing indicator is visible while the Blazor runtime loads.
