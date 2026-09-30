import re

with open('src/pages/teacher/TeacherStats.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'StudentProfileModal' not in content:
    content = content.replace(
        'import DashboardLayout',
        "import StudentProfileModal from '../../components/profile/StudentProfileModal';\nimport DashboardLayout",
        1
    )

# Add state
if 'studentModalOpen' not in content:
    content = content.replace(
        "const [sortBy, setSortBy] = useState('recent');",
        "const [sortBy, setSortBy] = useState('recent');\n  const [selectedStudent, setSelectedStudent] = useState(null);"
    )

# Add onclick to row
content = content.replace(
    '<tr key={st.id} className="border-b',
    '<tr key={st.id} onClick={() => setSelectedStudent(st)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 border-b'
)

# Add modal before DashboardLayout end
if '<StudentProfileModal' not in content:
    content = content.replace(
        '</DashboardLayout>',
        '''  {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </DashboardLayout>'''
    )

with open('src/pages/teacher/TeacherStats.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
