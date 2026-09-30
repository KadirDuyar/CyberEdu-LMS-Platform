with open('src/pages/teacher/CohortDetails.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Make sure Sparkles is imported
if 'Sparkles,' not in content:
    content = content.replace(
        "import {\n  ArrowLeft,",
        "import {\n  Sparkles,\n  ArrowLeft,",
        1
    )
    if 'Sparkles,' not in content:
        content = content.replace("ArrowLeft,", "Sparkles, ArrowLeft,")

# 2. Fix the if (loading) block
loading_block_start = "if (loading) {\n    return (\n      <DashboardLayout>\n        <LoadingSpinner fullPage />"
clean_loading_block = """if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage />
      </DashboardLayout>
    );
  }"""

# Find from `if (loading)` to `return (\n    <DashboardLayout>\n      <div className="max-w-6xl`
import re
pattern = r'if \(loading\) \{.*?return \(\s*<DashboardLayout>\s*<div className="max-w-6xl'
replacement = clean_loading_block + '\n\n  return (\n    <DashboardLayout>\n      <div className="max-w-6xl'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/pages/teacher/CohortDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("CohortDetails fixed successfully")
