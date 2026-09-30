with open('src/pages/teacher/CohortDetails.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'SafeMarkdown' not in content[:1000]:
    content = content.replace(
        'import {',
        "import SafeMarkdown from '../../components/ui/SafeMarkdown';\nimport {",
        1
    )
    with open('src/pages/teacher/CohortDetails.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
