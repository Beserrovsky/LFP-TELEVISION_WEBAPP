# Small Group Engagement Demo

A meeting-ready demo for real-time small group survey engagement. The app lets a facilitator configure survey questions, collect responses over Web Serial, and show a clean shared group screen from the same response stream.

## Features

- Guided setup flow for live small group sessions
- Private survey questions plus public group-screen engagement questions
- Four live group screens: Aquarium, Sand Art, Tree, and ASCII Aquarium
- Four blank collaborator visualisation slots
- ESP32 receiver integration through the Web Serial API
- ESP-NOW sender and receiver sketches for multi-device survey testing
- Google Forms API import for form questions, options, types, and required status
- Private results, CSV export, and advanced troubleshooting controls
- Local persistence through `localStorage`
- Built-in response simulation for browser-only testing
- Vanilla HTML, CSS, and JavaScript with no build step

## Visualisations

### Aquarium

The Aquarium visualisation is a canvas-based public display. Each submission adds a sprite creature to the tank using the public fish fields:

- `fishVariant`: betta, tetra, gourami, shark, or crab sprite variant
- `name`: optional first name shown with the creature

The aquarium uses `assets/aquarium-background.jpg`, sprite assets under `assets/sprites/`, and the high-resolution betta frame sequence under `assets/high-res/betta/right/frame-01.png` through `frame-10.png`. Fish school and avoid sharks, sharks cruise independently, and crabs stay on the tank floor with bottom-aligned sprites, random left/right crawl intervals, short pauses, and rare small hops that float back down.

### Sand Art

The Sand Art visualisation is a retro pixel canvas with falling sand particles and a CRT-style interface. Each submission adds coloured sand using:

- `sandColor`: selected from the configured colour options
- `sandPosition`: left, centre-left, centre, centre-right, or right

### Tree

The Tree visualisation is available at `#/vis3`. It uses `assets/tree-background.png` as the illustrated tree background and places response leaves or flowers along traced branch paths.

Public Tree fields:

- `treePart`: leaf or flower
- `name`: optional first name

Leaves are drawn from `assets/leaf.png` and receive a stable random green colour shift per response, so the canopy has natural variation while preserving each response position between refreshes.

### ASCII Aquarium

The ASCII Aquarium is available at `#/vis8`. It keeps the original retro text-art aquarium style while using the same stored response stream as the other group screens.

Public ASCII Aquarium fields:

- `fishStyle`: tiny, medium, round, classic, crab, or shark
- `fishColor`: selected from the configured colour options
- `fishSize`: small, medium, or large
- `name`: optional first name

The view includes response and creature counters, fullscreen controls, optional UI hiding, and live polling for newly received submissions.

### Collaborator Slots

Four blank visualisation pages are available for collaborators:

- `#/vis4`: edit `js/visualisation-1.js`
- `#/vis5`: edit `js/visualisation-2.js`
- `#/vis6`: edit `js/visualisation-3.js`
- `#/vis7`: edit `js/visualisation-4.js`

Each slot appears in the setup visualisation picker and can be launched through the normal Group screen route. The starter modules create an empty full-screen canvas and receive the current app `state`, including `state.responses`.

## Project Structure

```text
.
|-- index.html
|-- styles.css
|-- README.md
|-- assets/
|   |-- aquarium-background.jpg
|   |-- tree-background.png
|   |-- leaf.png
|   |-- high-res/
|   |   `-- betta/
|   |       `-- right/
|   |           `-- frame-01.png ... frame-10.png
|   `-- sprites/
|       |-- betta-*.png
|       |-- tetra-*.png
|       |-- gourami-*.png
|       |-- shark-1.png
|       `-- crab-*.png
|-- js/
|   |-- app.js
|   |-- data.js
|   |-- storage.js
|   |-- serial.js
|   |-- aquarium.js
|   |-- ascii-aquarium.js
|   |-- sand.js
|   |-- tree.js
|   |-- visualisation-1.js
|   |-- visualisation-2.js
|   |-- visualisation-3.js
|   `-- visualisation-4.js
|-- inputESP/
|   `-- inputESP
|-- moduleESP/
|   `-- moduleESP.ino
|-- receiverESP/
|   `-- receiverESP.ino
|-- esp32-receiver-dongle/
|   `-- esp32-receiver-dongle.ino
`-- recieverESP2/
    `-- recieverESP2.ino
```

## Getting Started

1. Clone or download this repository.
2. Open `index.html` in a modern browser.
3. Use Chrome or Edge for ESP32 serial support.
4. Optional: flash `receiverESP/receiverESP.ino` or `recieverESP2/recieverESP2.ino` to an ESP32 for receiver testing.
5. Optional: flash `moduleESP/moduleESP.ino` to an ESP32-CAM sender for ESP-NOW simulated submissions.

No install or build step is required.

## Navigation

- Setup: guided session setup, survey import, receiver connection, and launch
- Private results: facilitator-only dashboard and CSV export
- Group screen: shared display for the room
- Advanced: receiver controls, simulated responses, duplicate warnings, and logs

## Survey Configuration

Private questions are configurable in the setup view:

- `q1`: "Rate J&J on innovation", 1-5 scale with options `1`, `2`, `3`, `4`, `5`
- `q2`: "Satisfaction with J&J interactions", 5-point Likert scale with options `Very low`, `Low`, `Neutral`, `High`, `Very high`
- `q3`: "Recommend J&J to a colleague?", 0-10 NPS-style score

The Questions step supports two Google Forms import paths:

- Google Forms API import: paste a Google Form editor link or form ID, enter a Google OAuth Web application client ID, authenticate with Google, and import through `forms.get(formId)`.
- CSV fallback: upload a Google Forms response CSV to infer questions from response headers.

For API import, enable the Google Forms API in Google Cloud and create an OAuth client for a browser-based web application. Add the hosted origin or a local test origin such as `http://localhost:8000` to the OAuth client. The app requests `https://www.googleapis.com/auth/forms.body.readonly`, reads the form body with `GET https://forms.googleapis.com/v1/forms/{formId}`, then converts supported question items into the editable internal schema. Choice and grid options become editable option lists, scale questions keep their min/max where possible, text questions become short text fields, and unsupported items are skipped with an import note. Published `/forms/d/e/.../viewform` response links do not expose the API form ID, so use the editor URL or paste the form ID directly.

Public engagement questions are generated from the selected group screen so the ESP32 receiver and browser display stay aligned. The Web Serial parser ignores non-JSON debug lines and accepts Arduino-style lowercase `submission` packets with `answers.innovation`, `answers.satisfaction`, `answers.nps`, `answers.fish_type`, `answers.fish_colour`, and `answers.name`, mapping them internally to the app's existing `q1`, `q2`, `q3`, `fishVariant`, `fishColour`, and `name` fields.

## ESP32 Hardware

The ESP32 receiver firmware emits survey submissions over USB serial at 115200 baud. It supports the active visualisation and emits JSON lines that the Web Serial integration reads into the browser.

`esp32-receiver-dongle/esp32-receiver-dongle.ino` is the current receiver dongle sketch. In `EMULATOR_MODE` it emits JSON-only fake submissions every four seconds using the lowercase web app schema and `session_id` `test001`. With `EMULATOR_MODE` disabled it receives ESP-NOW dial packets, tracks known dial MACs/device IDs, broadcasts the active question set, sends ACK packets after valid submissions, and forwards each valid submission to Web Serial.

`recieverESP2/recieverESP2.ino` is an ESP-NOW receiver sketch. It listens for compact survey packets, converts them into the app's `SUBMISSION` JSON format, and prints one object per line over USB serial.

`moduleESP/moduleESP.ino` is an ESP32-CAM sender sketch for simulated survey modules. It sends random scores, names, and `fishVariant` values to the receiver over ESP-NOW for unattended hardware testing.

To connect:

1. Open Setup or Advanced.
2. Click "Connect receiver".
3. Pick the ESP32 device.
4. Click "Send question set" to review the confirmation summary.
5. Confirm to sync the current configuration to the ESP32 input devices.

## Technical Notes

- Single-page app using hash-based routing
- ES module JavaScript with pure browser APIs
- Canvas API for Aquarium, Sand Art, Tree, and ASCII Aquarium
- Web Serial API for ESP32 communication
- State saved automatically to `localStorage`
- Live visualisation views poll stored responses without remounting on each serial update
- Visualisation routes are wired through `visualisationDefinitions` in `js/data.js` and starter functions in `js/app.js`
- Sprite aquarium variants are configured through `fishSpriteOptions`, `fishSpritePaths`, and species-specific sprite frame metadata in `js/aquarium.js`
- Operator UI styling uses a dark Johnson & Johnson-inspired red colour system in `styles.css`; public visualisation canvas rendering remains separate.

## Browser Support

- Chrome 89+: full support including Web Serial
- Edge 89+: full support including Web Serial
- Firefox: visualisations work, Web Serial unavailable
- Safari: visualisations work, Web Serial unavailable

## License

Demo project for small group engagement workflows.
