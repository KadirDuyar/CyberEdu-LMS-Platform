import re

with open('src/pages/teacher/CohortDetails.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'StudentProfileModal' not in content:
    content = content.replace(
        "import SafeMarkdown",
        "import StudentProfileModal from '../../components/profile/StudentProfileModal';\nimport SafeMarkdown",
        1
    )

# Add state
if 'selectedStudentModal' not in content:
    content = content.replace(
        "const [aiAnalysisModalOpen",
        "const [selectedStudentModal, setSelectedStudentModal] = useState(null);\n  const [aiAnalysisModalOpen"
    )

# Add onclick to row
content = content.replace(
    '<tr key={st.id} className="hover:bg-slate-50',
    '<tr key={st.id} onClick={() => setSelectedStudentModal(st)} className="cursor-pointer hover:bg-slate-50'
)

# Add modal before DashboardLayout end
if '<StudentProfileModal' not in content:
    content = content.replace(
        '</DashboardLayout>',
        '''  {selectedStudentModal && (
        <StudentProfileModal
          student={selectedStudentModal}
          onClose={() => setSelectedStudentModal(null)}
        />
      )}
    </DashboardLayout>'''
    )

with open('src/pages/teacher/CohortDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
