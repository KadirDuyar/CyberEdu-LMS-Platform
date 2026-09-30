import os

files_to_check = [
    'src/pages/teacher/CohortDetails.jsx',
    'src/pages/teacher/TeacherStats.jsx',
    'src/components/profile/StudentProfileModal.jsx'
]

for file_path in files_to_check:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change import
    content = content.replace("import SafeMarkdown from '../../components/ui/SafeMarkdown';", "import FormattedAiMessage from '../../components/ui/FormattedAiMessage';")
    content = content.replace("import SafeMarkdown from '../ui/SafeMarkdown';", "import FormattedAiMessage from '../ui/FormattedAiMessage';")

    # Change component usage
    content = content.replace("<SafeMarkdown content={aiAnalysisResult} />", "<FormattedAiMessage text={aiAnalysisResult} />")
    content = content.replace("<SafeMarkdown content=", "<FormattedAiMessage text=")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
