# Room message context

Room messages remain ordinary messages in the originating Group conversation or
its section. A Room never owns a second timeline and ending or archiving it does
not delete, hide or relocate the message.

## Lifecycle

- Sending while connected to a core Room may attach one immutable context row.
- The context stores the exact live session plus a snapshot of the Room name and
  kind. Foreign keys may later become `null`; the snapshot remains readable.
- A message stays available through the normal history, search, replies, pins,
  media library, retention and export rules of its conversation.
- Room lifecycle events are not Room messages. Repeated open/close events remain
  aggregated outside the ordinary message timeline.

## Access and moderation

- Reading a context never grants access to a message. The existing conversation
  membership and section rules are checked first.
- A sender may attach only a currently active live session in which they are an
  active participant, and only when its Group is the root of the target
  conversation or section.
- Editing or deleting the message follows the existing message rules. The Room
  snapshot is not user-editable and is deleted with the message.
- Guests do not receive Group history and cannot create durable Room messages
  until they convert to an account and obtain normal conversation access.
- Telemetry may record that a message had Room context, but never the Room,
  session, message or participant identifiers.

## Presentation

The regular Group timeline shows a quiet `Из комнаты <name>` marker at the start
of each message group. A future Room side panel is only an access-aware filter
over this same history. It must include loading, empty, error, offline and ended
states without introducing another storage lifecycle.
