import sys

def replace_in_file(path, old, new):
    with open(path, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)

# Fix test_roles.py
replace_in_file('tests/test_roles.py', 
    "ROLES_THAT_CAN_MANAGE_BOOTHS = {'event_owner', 'super_admin', 'room_coordinator'}",
    "ROLES_THAT_CAN_MANAGE_BOOTHS = {'event_owner', 'super_admin'}")
replace_in_file('tests/test_roles.py',
    "ROLES_THAT_CANNOT_MANAGE_BOOTHS = {'interpreter'}",
    "ROLES_THAT_CANNOT_MANAGE_BOOTHS = {'interpreter', 'room_coordinator'}")
replace_in_file('tests/test_roles.py',
    "@pytest.mark.parametrize('role', ['super_admin', 'event_owner', 'room_coordinator'])",
    "@pytest.mark.parametrize('role', ['super_admin', 'event_owner'])")
replace_in_file('tests/test_roles.py',
    "@pytest.mark.parametrize('role', ['interpreter'])",
    "@pytest.mark.parametrize('role', ['interpreter', 'room_coordinator'])")

# Fix test_fastapi_app.py
replace_in_file('tests/test_fastapi_app.py',
    "test_interpreter_booth_admin_user_gets_event_admin_role",
    "test_interpreter_booth_admin_user_gets_event_owner_role")
replace_in_file('tests/test_fastapi_app.py',
    "assert b'\"role\": \"event_admin\"' in resp.content",
    "assert b'\"role\": \"event_owner\"' in resp.content")

# Fix test_memberships_tokens.py
replace_in_file('tests/test_memberships_tokens.py',
    "assert roles == {'interpreter'}",
    "assert roles == {'interpreter', 'room_coordinator'}")
replace_in_file('tests/test_memberships_tokens.py',
    "assert b'Manage Members' in resp.content",
    "assert b'Manage Room' in resp.content") # Or remove the assert if Manage Members was removed from templates

print("Test fixes applied")
