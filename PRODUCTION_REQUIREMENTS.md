# Interpretation Studio Product Requirements

## Core concept

This is NOT a meeting app.

This is a moderator-controlled live broadcast studio.

Users:
- Moderator
- Interpreter
- Viewer

Flow:

Interpreter joins
↓
Backstage

Moderator sees:

[Interpreter A]
[Interpreter B]
[Interpreter C]

Moderator can:

- mute interpreter
- unmute interpreter
- select active speaker
- add interpreter to stream
- remove interpreter
- position interpreter on stream

Media:

- PDF
- slides
- image
- video
- screen share
- YouTube source

Media becomes:

background layer

Interpreters become:

overlay layers

Example:

+-----------------------------------+
|                                   |
|          PDF / Slides             |
|                                   |
|                           +-----+ |
|                           | INT | |
|                           | cam | |
|                           +-----+ |
+-----------------------------------+

Only moderator-selected audio reaches stream.

Audio routing:

Interpreter A muted
Interpreter B active
Interpreter C muted

Only Interpreter B:

→ YouTube stream audio

Final pipeline:

Media
+ Interpreter overlays
+ Audio source
↓
Render composition
↓
RTMP
↓
YouTube Live

Preview mode:

Moderator edits preview

Moderator clicks:

Push Live

Only then:

YouTube output changes