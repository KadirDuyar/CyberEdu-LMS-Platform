with open('src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'path="/student/profile/:studentId"' in line:
        if 'allowedRoles' in lines[i+1]:
             lines[i+1] = lines[i+1].replace("['student']", "['student', 'teacher', 'admin']")
        elif 'allowedRoles' in lines[i+2]:
             lines[i+2] = lines[i+2].replace("['student']", "['student', 'teacher', 'admin']")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
