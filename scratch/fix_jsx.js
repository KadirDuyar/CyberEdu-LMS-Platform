const fs = require('fs');
const file = 'src/pages/student/LessonPage.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/="\{([^}]+)\}"/g, '={$1}');
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed');
