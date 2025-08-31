// This file is required for deploying a single-page app to GitHub Pages
// It redirects all requests to index.html so client-side routing works

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const redirectHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="refresh" content="0; url=./index.html" />
  </head>
  <body></body>
</html>
`;

fs.writeFileSync(path.join(distDir, '404.html'), redirectHtml);
