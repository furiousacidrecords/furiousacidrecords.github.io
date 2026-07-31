import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const cssMarker = '/* purple-progress-embed:start */';
const progressMarker = 'data-purple-progress-frame';
const calcMarker = 'data-reaction-balancer-frame';

const css = `
    /* purple-progress-embed:start */
    .purple-progress-frame,
    .reaction-balancer-frame {
      display: block;
      width: 100%;
      margin-top: 8px;
      overflow: hidden;
      border: 0;
      border-radius: 14px;
      box-shadow: var(--shadow);
    }

    .purple-progress-frame {
      height: 150px;
      background: #09060f;
    }

    .reaction-balancer-frame {
      height: 560px;
      background: #f5f3f8;
    }

    @media (max-width: 620px) {
      .purple-progress-frame { height: 118px; }
      .reaction-balancer-frame { height: 680px; }
    }
    /* purple-progress-embed:end */
`;

const progressFrame = `
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

const calcFrame = `
    <iframe
      class="reaction-balancer-frame"
      data-reaction-balancer-frame
      src="calc/?embed=1"
      title="Furious Acid educational reaction balancer"
      loading="eager"
      scrolling="yes"
      sandbox="allow-scripts allow-same-origin allow-downloads"
    ></iframe>

`;

const existingCssStart = html.indexOf('    /* purple-progress-embed:start */');
const existingCssEnd = html.indexOf('    /* purple-progress-embed:end */');
if (existingCssStart !== -1 && existingCssEnd !== -1) {
  html = html.slice(0, existingCssStart) + css + html.slice(existingCssEnd + '    /* purple-progress-embed:end */'.length);
} else if (!html.includes(cssMarker)) {
  const styleClose = html.indexOf('</style>');
  if (styleClose === -1) throw new Error('Could not find </style> in index.html');
  html = html.slice(0, styleClose) + css + html.slice(styleClose);
}

if (!html.includes(progressMarker)) {
  const updateStrip = html.indexOf('    <aside class="update-strip"');
  if (updateStrip === -1) throw new Error('Could not find the Updates strip in index.html');
  html = html.slice(0, updateStrip) + progressFrame + html.slice(updateStrip);
}

if (!html.includes(calcMarker)) {
  const progressClose = html.indexOf('</iframe>', html.indexOf(progressMarker));
  if (progressClose === -1) throw new Error('Could not find the Purple progress iframe closing tag');
  const insertAt = progressClose + '</iframe>'.length;
  html = html.slice(0, insertAt) + '\n' + calcFrame + html.slice(insertAt);
}

await writeFile(indexPath, html);
console.log('Purple progress banner and educational reaction balancer are installed above Updates.');
