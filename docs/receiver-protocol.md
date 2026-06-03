# Receiver Protocol — SurveyPacket Field Reference

This document describes the ESP-NOW packet sent by the M5Dial survey device and how the receiver should interpret each field.

---

## Packet Structure

```c
typedef struct __attribute__((packed)) {
    // Transport header
    uint8_t  packetType;       // Always 2 (PACKET_SUBMISSION)
    uint8_t  device_id;        // Sending device ID (currently 3)
    uint32_t counter;          // Wrapping sequence number — used for deduplication
    uint32_t timestamp_ms;     // Device uptime in ms at send time

    // Respondent identity (from NFC tag)
    char name[16];             // First name, e.g. "Felipe"
    char identifier[16];       // Unique ID: phone number or employee ID, e.g. "11987654321"

    // Survey answers
    uint8_t  innovation;       // Q1: 1–5  (1 = lowest, 5 = highest)
    uint8_t  satisfaction;     // Q2: 1 = Yes, 0 = No
    uint8_t  nps;              // Q3: 0–10 (NPS score, direct value)
    char     bestEmployee[12]; // Q4: "Junior" | "Vitoria" | "Sergio"
} SurveyPacket;
// Total: 57 bytes (packed, no padding)
```

### Size breakdown

| Section | Fields | Bytes |
|---|---|---|
| Transport | packetType, device_id, counter, timestamp_ms | 10 |
| Identity | name[16], identifier[16] | 32 |
| Answers | innovation, satisfaction, nps, bestEmployee[12] | 15 |
| **Total** | | **57** |

---

## Field Reference

### Transport Header

#### `packetType` — `uint8_t`

Always `2` for survey submissions. Discard packets with any other value.

| Value | Type |
|---|---|
| `1` | PACKET_QUESTION_SET — not sent by M5Dial |
| `2` | PACKET_SUBMISSION — survey response |
| `3` | PACKET_ACK — sent by receiver back to M5Dial |

#### `device_id` — `uint8_t`

Always `3` in the current deployment. Use to distinguish between multiple devices in a multi-device setup.

#### `counter` — `uint32_t`

`millis() & 0xFFFF` at send time. Use with `device_id` to detect retransmissions. The device retries up to 4 times if no ACK is received — discard duplicates with the same `(device_id, counter)` pair seen within a ~5 second window.

#### `timestamp_ms` — `uint32_t`

Device uptime in milliseconds at submission. Not wall-clock time. Useful for relative ordering within a session.

---

### Respondent Identity

Both fields come from the NDEF text record written on the respondent's NFC badge. The tag stores a JSON string in the form:

```json
{"name":"Felipe","id":"11987654321"}
```

#### `name[16]` — `char[]` (null-terminated)

Respondent first name, up to 15 characters. Empty string when session started via 5-click debug path (no NFC).

#### `identifier[16]` — `char[]` (null-terminated)

Unique identifier — typically a phone number or employee ID. Up to 15 characters. Empty string if:
- The `id` field is absent from the NFC JSON (only `name` is required on the tag)
- Session started via debug path

---

### Survey Answers

#### `innovation` — `uint8_t`

**Q1: "How would you rate J&J on innovation?"**

Scale of 1 to 5. Stored 1-based.

| Value | Label |
|---|---|
| `1` | 1 — lowest |
| `2` | 2 |
| `3` | 3 |
| `4` | 4 |
| `5` | 5 — highest |

#### `satisfaction` — `uint8_t`

**Q2: "Happy with J&J interactions?"**

| Value | Label |
|---|---|
| `1` | Yes |
| `0` | No |

#### `nps` — `uint8_t`

**Q3: "Recommend J&J to a colleague?"**

NPS score 0 to 10. Value equals the displayed number directly.

| Value | Meaning |
|---|---|
| `0`–`6` | Detractor |
| `7`–`8` | Passive |
| `9`–`10` | Promoter |

#### `bestEmployee[12]` — `char[]` (null-terminated)

**Q4: "Best J&J Employee"**

| Value | Meaning |
|---|---|
| `"Junior"` | Junior selected |
| `"Vitoria"` | Vitoria selected |
| `"Sergio"` | Sergio selected |

---

## NFC Tag Format

Tags must be NTAG213, NTAG215, or NTAG216. The NDEF record must be a **text record** (type `T`, well-known type) containing a UTF-8 JSON string.

### Minimum required JSON

```json
{"name":"Felipe"}
```

### Full JSON with unique identifier

```json
{"name":"Felipe","id":"11987654321"}
```

### Constraints

| Field | Max length | Notes |
|---|---|---|
| `name` | 15 chars | Required. Tag rejected if absent. |
| `id` | 15 chars | Optional. Empty string if absent. |

---

## ACK Response

The receiver must send back a `DialAckPacket` after receiving a submission:

```c
typedef struct __attribute__((packed)) {
    uint8_t  packetType;    // 3 (PACKET_ACK)
    char     session_id[16];// Reserved — send as empty string
    uint8_t  device_id;     // Echo the device_id from the survey packet
    uint32_t counter;       // Echo the counter from the survey packet
    bool     accepted;      // true = accepted, false = rejected
} DialAckPacket;
```

| `accepted` | M5Dial behavior |
|---|---|
| `true` | Success screen → returns to Home after timer |
| `false` | Error screen → user may resubmit |

If no ACK arrives within 500 ms the device retries. After 4 failed retries it shows an error screen.
