# Theme motion icon attribution

These decorative icons are unmodified OpenMoji Black SVG graphics, pinned to release 17.0.0.

All emojis designed by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0.

- Project: https://openmoji.org/
- Source repository: https://github.com/hfg-gmuend/openmoji/tree/17.0.0/black/svg
- License: https://creativecommons.org/licenses/by-sa/4.0/
- Included license text: LICENSE-OpenMoji.txt

The downloaded SVG paths have not been altered. Filenames were renamed for application use. CSS may tint, position and animate the icons. Derived OpenMoji artwork must retain the same CC BY-SA 4.0 license.

## Included assets

| File | OpenMoji title | Author | Original SVG |
| --- | --- | --- | --- |
| `spider.svg` | spider | Selina Bauder | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F577.svg) |
| `spider-web.svg` | spider web | Selina Bauder | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F578.svg) |
| `witch.svg` | woman mage | Nadine Bartel | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F9D9-200D-2640-FE0F.svg) |
| `broom.svg` | broom | Tonia Reinhardt | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F9F9.svg) |
| `santa.svg` | Santa Claus | Lisa Thiel | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F385.svg) |
| `sleigh.svg` | sled | Nicole Kornhaas | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F6F7.svg) |
| `deer.svg` | deer | Sofie Ascherl | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F98C.svg) |
| `gift.svg` | wrapped gift | Laura Humpfer | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F381.svg) |
| `comet.svg` | comet | Lois Proksch | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/2604.svg) |
| `heart.svg` | red heart | Laura Humpfer | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/2764.svg) |
| `bunny.svg` | rabbit | Sofie Ascherl | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F407.svg) |
| `easter-egg.svg` | egg | Niklas Kuntz | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/1F95A.svg) |
| `pyramid.svg` | great pyramid of giza | Niklas Kuntz | [Source](https://raw.githubusercontent.com/hfg-gmuend/openmoji/17.0.0/black/svg/E20F.svg) |

## Integration notes

All assets have a 72 × 72 viewBox. They are transparent with black outlines and occasional black details, ready for a CSS alpha mask. Keep mask-size: contain; mask-repeat: no-repeat; mask-position: center. Animate the containing element using transform and opacity.

Suggested grouping: witch.svg with broom.svg, and santa.svg with sleigh.svg plus deer.svg. The supplied Easter egg is the set’s plain egg icon; no painted-egg icon exists in this release.

Useful decorative Unicode Egyptian hieroglyphs: 𓂀 (U+13080, D010); 𓆣 (U+131A3, L001); 𓋹 (U+132F9, S034); 𓇳 (U+131F3, N005); 𓊹 (U+132B9, R008). These are valid hieroglyph characters, not a translated phrase. Test the selected font for coverage; browser fallback may differ by device.

sources.json records each original URL, author, and SHA-256 checksum.

## Hieroglyph font

`hieroglyphs.woff` is a five-character subset of Noto Sans Egyptian Hieroglyphs Regular, renamed Theme Hieroglyphs. Original glyph outlines are unchanged. Original source: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosansegyptianhieroglyphs), downloaded 2026-09-05. Licensed under the SIL Open Font License 1.1; see `LICENSE-Noto.txt`. The subset is U+13080, U+131A3, U+132F9, U+131F3, U+132B9. It loads only when SOBOKILL interactive effects are enabled.
