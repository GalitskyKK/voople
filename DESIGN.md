---
name: Voople design authority index
description: Existing presentation authority and the optional Orbit interface contract.
---

# Voople design authority index

## Overview

[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) owns Voople presentation, including themes,
typography, materials and shared components. This index adds no global tokens
or visual rules. [PRODUCT.md](PRODUCT.md) owns current product behavior;
[ARCHITECTURE.md](ARCHITECTURE.md) and
[docs/core-rework-architecture.md](docs/core-rework-architecture.md) own technical
invariants.

[docs/orbit-interface.md](docs/orbit-interface.md) records the implemented
optional Orbit presentation: expandable navigation, a borderless Room lens,
lower-edge avatar previews, a floating participant roster and one combined
desktop Compact/account dock. Those changes apply only to Orbit. Classic remains the
default and retains its existing identity.

The narrow [.impeccable/design.json](.impeccable/design.json) sidecar records
observed Orbit motion and responsive metadata for tooling. It is an index
extension, not a second palette or component library.
