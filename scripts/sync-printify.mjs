import { writeFile } from 'node:fs/promises';

const STORE_URL = 'https://furiousacid.printify.me/products';
const OUTPUT_PATH = new URL('../merch-data.json', import.meta.url);

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

const response = await fetch(STORE_URL, {
  headers: { 'user-agent': 'FuriousAcidMerchSync/1.0' }
});

if (!response.ok) {
  throw new Error(`Printify returned ${response.status}`);
}

const html = await response.text();
const cardPattern = /<a class="block w-full overflow-hidden" href="\/product\/(\d+)">[\s\S]*?<img src="([^"]+)" alt="([^"]+)"[\s\S]*?<span[^>]*data-testid="variantPrice">([^<]+)<\/span>/g;
const products = [];
const seen = new Set();

for (const match of html.matchAll(cardPattern)) {
  const [, id, rawImage, rawTitle, rawPrice] = match;
  if (seen.has(id)) continue;
  seen.add(id);
  products.push({
    id,
    title: decodeHtml(rawTitle.trim()),
    price: decodeHtml(rawPrice.trim()),
    image: decodeHtml(rawImage),
    url: `https://furiousacid.printify.me/product/${id}`
  });
}

if (products.length === 0) {
  throw new Error('No Printify products were found; existing merch data was left unchanged.');
}

const feed = {
  source: STORE_URL,
  updatedAt: new Date().toISOString(),
  products
};

const output = `${JSON.stringify(feed, null, 2)}\n`;

if (process.env.CHECK_ONLY === '1') {
  process.stdout.write(output);
} else {
  await writeFile(OUTPUT_PATH, output, 'utf8');
  process.stdout.write(`Synced ${products.length} Printify products.\n`);
}
