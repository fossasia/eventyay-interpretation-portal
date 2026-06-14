import glob
import os

# Fix room_room_coordinator typo
docs = glob.glob('.github/.agents/context/*.md') + glob.glob('docs/**/*.mdx', recursive=True) + glob.glob('docs/**/*.md', recursive=True)
for path in docs:
    with open(path, 'r') as f:
        content = f.read()
    if 'room_room_coordinator' in content:
        with open(path, 'w') as f:
            f.write(content.replace('room_room_coordinator', 'room_coordinator'))

# Fix tests syntax errors
tests = glob.glob('tests/*.py')
for path in tests:
    with open(path, 'r') as f:
        content = f.read()
    
    if 'role=)' in content:
        if 'test_booth_state.py' in path:
            content = content.replace("role=)", "role='room_coordinator')")
            content = content.replace("test_listener_cannot_set_ingest_connected", "test_room_coordinator_cannot_set_ingest_connected")
            content = content.replace("Listener role must not", "Room coordinator role must not")
        elif 'test_memberships_tokens.py' in path:
            content = content.replace("role=)", "role='room_coordinator')")
            content = content.replace("role=label='T2'", "role='room_coordinator', label='T2'")
        else:
            content = content.replace("role=)", "role='interpreter')")
            
        with open(path, 'w') as f:
            f.write(content)

print("Fixed tests and docs.")
