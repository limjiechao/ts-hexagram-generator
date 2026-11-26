# User manuals

The user manuals are the standard for what each channel does (ADR-0042, "User
manuals"; R-008). Byte fixtures stay the standard for exact output. Each
manual covers Brooks's nine items: purpose; environment; domain and range;
functions and algorithms; input-output formats; operating instructions,
including normal and abnormal endings; options; running time; accuracy and
checking. A manual becomes authoritative only when the owner ratifies it.

| Manual    | Channel     | Status   | Gate                                   |
| --------- | ----------- | -------- | -------------------------------------- |
| `cli.md`  | CLI         | ratified | must be ratified before Phase 4 starts |
| `rest.md` | REST engine | pending  | must be ratified before Phase 5 starts |

Manuals are not Matters. Each is drafted in a copilot session with the owner
and then ratified by the owner. The clerk raises "draft the manual" as a
question when the phase before its gate lands.
