# Analysis mascot assets

Each illustration numbered 1–21 in the supplied sticker sheet has its own viewport in parts.json. MascotPart renders any individual viewport with its original aspect ratio. The shared transparent sheet is fetched once; rigid parts rotate/translate independently.

Rig: 2 left arm, 3 right arm/hand, 4 magnifier, 5–6 feet, 7 reaction accents, 8 neutral body, 13 blink body, 10 excited body. Other numbered illustrations remain available as independent parts; complete poses 15–21 are not overlaid on the articulated rig.

The 4-second CSS loop is decorative, not AI progress. No timers, state transitions or network requests are driven by it. Reduced motion shows the static assembled neutral character.

Preparation: built-in image_gen edit, transparent background. Prompt requested preserving all 21 illustrations at their original positions while removing background gradients, tile outlines and numbered labels. Retain dark outlines, white interiors and red accent artwork. No new character or parts.

Right-arm correction: part 3 now references right-arm-v2.png. Built-in image_gen removed its redundant handle stub; the magnifier remains a separate part 4. The arm is oriented at its fist pivot, and both parts scan together so the grip stays connected. Other numbered assets retain their existing sheet viewports.
