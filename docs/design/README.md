# Design models for the overhaul

Formal models of the overhauled system, transcribed from the settled design.
They hold no decisions of their own. Every term is defined in
[`CONTEXT.md`](../../CONTEXT.md), and every decision is recorded in an ADR
(chiefly [ADR-0023](../adr/0023-random-division-equiprobable-remainder-groups.md)
to [ADR-0038](../adr/0038-rest-engine.md)). Where a model and an
ADR disagree, the ADR wins and the model is wrong.

| Model                 | File                                 | Shows                                                                                            |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| UML use-case diagram  | [use-cases.md](use-cases.md)         | actors, the ten use cases, include/extend relations, channels                                    |
| UML activity diagrams | [activity.md](activity.md)           | Cast (all three Division Methods), Record, Merge Journals                                        |
| UML sequence diagrams | [sequence.md](sequence.md)           | Virtual Cast in the CLI, Automatic Cast in the PWA via REST, Open a Consultation, Merge Journals |
| EventStorming         | [eventstorming.md](eventstorming.md) | Big Picture timeline; tactical model per bounded context                                         |
| Data Flow Diagrams    | [dfd.md](dfd.md)                     | Level 0 (context) and Level 1                                                                    |

Diagrams are Mermaid, so they render on GitHub. Class and object diagrams are
deliberately omitted: the domain is modelled as values and pure functions,
not object graphs.
