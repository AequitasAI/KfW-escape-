# Minimal Data Model

## sessions
- id UUID PK
- code UNIQUE
- status
- current_puzzle_index
- started_at
- paused_at
- total_paused_ms
- puzzle_state_json
- created_at
- finished_at
- hints_used

## players
- id UUID PK
- session_id FK
- display_name
- connected
- solver_count
- declined_current_puzzle
- created_at
- last_seen_at

## puzzle_events (optional, useful for debugging)
- id
- session_id
- puzzle_id
- player_id nullable
- event_type
- payload_json
- created_at

Keine Mailadresse, kein Passwort, kein echtes Mitarbeiterkennzeichen.
