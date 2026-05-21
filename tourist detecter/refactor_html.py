import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract Security Tab Pane
start_marker = "<!-- Tab Pane: Security -->"
end_marker = "</div> <!-- End Tab Pane Security -->"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    security_pane = content[start_idx:end_idx]
    # Remove it from the original location
    content = content[:start_idx] + content[end_idx:]

# 2. Remove Tab Switcher
tab_switcher_pattern = r'<!-- Tab Switcher -->\s*<div class="right-panel-tabs".*?</div>'
content = re.sub(tab_switcher_pattern, '', content, flags=re.DOTALL)

# 3. Clean up Overview Tab Pane wrapper (we don't need it if there's no tabs)
overview_start_pattern = r'<!-- Tab Pane: Overview -->\s*<div id="tab-pane-overview"[^>]*>'
content = re.sub(overview_start_pattern, '<!-- Overview Content -->\n                    <div style="display: flex; flex-direction: column; gap: var(--space-md);">', content)

# Remove the end wrapper for overview
content = content.replace("</div> <!-- End Tab Pane Overview -->", "</div> <!-- End Overview Content -->")

# 4. Create the new Protection Hub page
new_page = f"""
    <!-- ==================== PAGE: PROTECTION HUB ==================== -->
    <section id="page-protection" class="page hidden">
        <div class="blockchain-viewer-container" style="max-width: 1000px; margin: 0 auto; width: 100%;">
            <div class="page-header" style="margin-bottom: var(--space-md);">
                <h2><i class="fas fa-shield-cat"></i> Protection Hub</h2>
                <button class="btn btn-ghost" onclick="App.showPage('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
            </div>
            {security_pane.replace('style="display: none; flex-direction: column; gap: var(--space-md);"', 'style="display: flex; flex-direction: column; gap: var(--space-md);"').replace('id="tab-pane-security"', 'id="page-protection-content"')}
        </div>
    </section>
"""

# 5. Insert the new page before Blockchain page
insert_marker = "<!-- ==================== PAGE: BLOCKCHAIN VIEWER ==================== -->"
content = content.replace(insert_marker, new_page + "\n    " + insert_marker)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html refactored successfully.")
