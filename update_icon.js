import fs from 'fs';
const imgPath = 'C:\\Users\\jonat\\.gemini\\antigravity\\brain\\eaf3fc1c-59d7-4a7b-897e-45a485c3ad29\\redly_logo_1771766535445.png';
const base64 = fs.readFileSync(imgPath).toString('base64');
const dataUri = `data:image/png;base64,${base64}`;

const indexPath = 'c:\\Users\\jonat\\Downloads\\markdown-notes-pwa\\index.html';
let html = fs.readFileSync(indexPath, 'utf-8');
// Check if it already has the svg or a previous png
if (html.includes('<link rel="icon" type="image/svg+xml" href="/vite.svg" />')) {
    html = html.replace('<link rel="icon" type="image/svg+xml" href="/vite.svg" />', `<link rel="icon" type="image/png" href="${dataUri}" />`);
} else if (html.includes('<link rel="icon" type="image/png" href="data:image/png;base')) {
    html = html.replace(/<link rel="icon" type="image\/png" href="data:image\/png;base64,[^"]+" \/>/, `<link rel="icon" type="image/png" href="${dataUri}" />`);
}
fs.writeFileSync(indexPath, html);
console.log('Icon updated');
