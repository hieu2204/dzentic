// Ghép src/_fragments/*.html (theo thứ tự tên file) vào template -> index.html
import fs from 'node:fs';
const dir = 'src/_fragments';
const parts = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort()
  .map(f => `<!-- ===== ${f} ===== -->\n` + fs.readFileSync(`${dir}/${f}`, 'utf8').trim());
const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dzentic</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
${parts.join('\n\n')}
<script src="assets/js/app.js"></script>
</body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('index.html <-', parts.length, 'fragments');
