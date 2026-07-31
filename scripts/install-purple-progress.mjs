import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const cssMarker = '/* purple-progress-embed:start */';
const frameMarker = 'data-purple-progress-frame';

const css = `
    /* purple-progress-embed:start */
    .purple-progress-frame {
      display: block;
      width: 100%;
      height: 150px;
      margin-top: 8px;
      overflow: hidden;
      background: #09060f;
      border: 0;
      border-radius: 14px;
      box-shadow: var(--shadow);
    }

    @media (max-width: 620px) {
      .purple-progress-frame { height: 118px; }
    }
    /* purple-progress-embed:end */
`;

const frame = `
    <iframe
      class="purple-progress-frame"
      data-purple-progress-frame
      src="purple-progress.html?embed=1"
      title="Purple Rabbit live laboratory completion"
      loading="eager"
      scrolling="no"
      sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
    ></iframe>

`;

if (!html.includes(cssMarker)) {
  const styleClose = html.indexOf('</style>');
  if (styleClose === -1) throw new Error('Could not find </style> in index.html');
  html = html.slice(0, styleClose) + css + html.slice(styleClose);
}

if (!html.includes(frameMarker)) {
  const updateStrip = html.indexOf('    <aside class="update-strip"');
  if (updateStrip === -1) throw new Error('Could not find the Updates strip in index.html');
  html = html.slice(0, updateStrip) + frame + html.slice(updateStrip);
}

await writeFile(indexPath, html);
console.log('Purple progress banner is installed above Updates.');
