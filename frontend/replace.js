const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
         // skip node_modules etc
         if (file !== 'node_modules' && file !== '.next') {
            filelist = walk(dirFile, filelist);
         }
      } else {
         if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js')) {
            filelist.push(dirFile);
         }
      }
    } catch (e) {
      // ignore stat errors
    }
  });
  return filelist;
}

const allFiles = walk(path.join(__dirname, 'app'));

const ignoreFiles = ['login\\page.jsx', 'signup\\page.jsx', 'login/page.jsx', 'signup/page.jsx'];

for (const file of allFiles) {
  let shouldSkip = false;
  for (const ignore of ignoreFiles) {
    if (file.includes(ignore)) shouldSkip = true;
  }
  if (shouldSkip) continue;

  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    let newContent = content;
    
    // Replace alert('failed...') or alert("error...") with toast.error
    newContent = newContent.replace(/alert\((.*?)\)/g, (match, inside) => {
        if (!inside) return match;
        const lowerMsg = inside.toLowerCase();
        // Heuristic to decide if error or success
        if (lowerMsg.includes('error') || lowerMsg.includes('fail') || lowerMsg.includes('unable') || lowerMsg.includes('please') || lowerMsg.includes('missing') || lowerMsg.includes('not found') || lowerMsg.includes('select a role') || lowerMsg.includes('already')) {
             return `toast.error(${inside})`;
        } else {
             return `toast.success(${inside})`;
        }
    });

    if (newContent !== content) {
       // insert import if not present
       if (!newContent.includes('from "sonner"') && !newContent.includes("from 'sonner'")) {
           const importStatement = `import { toast } from "sonner";\n`;
           // Insert at beginning, but after "use client" if it exists
           if (newContent.startsWith('"use client";') || newContent.startsWith("'use client';")) {
             const lines = newContent.split('\n');
             lines.splice(1, 0, importStatement);
             newContent = lines.join('\n');
           } else {
             newContent = importStatement + newContent;
           }
       }
       fs.writeFileSync(file, newContent, 'utf8');
       console.log('Updated ' + file);
    }
  }
}
