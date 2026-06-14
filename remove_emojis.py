import os

files_to_edit = [
    'templates/listener-event.html',
    'templates/interpreter_booth.html',
    'templates/interpreter_landing.html',
    'templates/admin/booth_detail.html',
    'templates/home.html',
    'templates/admin/event_detail.html'
]

replacements = {
    '🎧 ': '',
    '🎧': '',
    '🎙️ ': '',
    '🎙️': '',
    '🔇 ': '',
    '🚀 ': ''
}

for path in files_to_edit:
    if not os.path.exists(path):
        continue
    with open(path, 'r') as f:
        content = f.read()
    for k, v in replacements.items():
        content = content.replace(k, v)
    with open(path, 'w') as f:
        f.write(content)

print("Emojis removed.")
