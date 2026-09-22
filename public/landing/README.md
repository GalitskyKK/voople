# Landing capture status

`now.png`, `room.png` and `chat.png` are temporary composition references. They
may be used during layout work, but they are not release evidence and must not
be presented as screenshots of the current production build.

Before the public beta landing ships, replace them with reproducible captures
from the authenticated production UI at the same data seed and viewport:

- Group `Войс` with Lobby, a second Room and one screen share;
- active full Room after media connection;
- Group Chat with normal messages and one Room-context marker.

Capture both 1440 px desktop and 390 px mobile, remove personal data, and keep
the source frames unscaled. The landing may crop a real frame with CSS but must
not reconstruct, redraw or AI-generate product UI inside the bitmap.
