"""Attach explicit source IDs; never derive identity from text or array order."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def attach_event_metadata(years, period):
    metadata = json.loads((ROOT / 'data-source/events/metadata.json').read_text(encoding='utf-8'))
    check_event_ids(years)
    for record in years.values():
        for event in record['events']:
            key = period + ':' + event['id']
            assert key in metadata, f'Missing explicit event metadata: {key}'
            event.update(metadata[key])


def check_event_ids(years):
    seen = set()
    for record in years.values():
        for event in record['events']:
            key = event['id']
            assert key and key not in seen, f'Duplicate event ID: {key}'
            seen.add(key)
