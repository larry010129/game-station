import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artifactsDir = '/opt/cursor/artifacts';
fs.mkdirSync(artifactsDir, { recursive: true });

const htmlPath = join(__dirname, 'preview/cards.html');
const fileUrl = `file://${htmlPath}`;

console.log(`Opening: ${fileUrl}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  // Test at phone width (390px)
  const pageMobile = await browser.newPage();
  
  // Capture console messages
  pageMobile.on('console', msg => console.log('Browser console:', msg.text()));
  pageMobile.on('pageerror', error => console.error('Page error:', error));
  
  await pageMobile.setViewport({ width: 390, height: 800 });
  await pageMobile.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  // Wait for content to load
  try {
    await pageMobile.waitForSelector('.gallery-page', { timeout: 5000 });
  } catch (e) {
    console.log('Warning: .gallery-page selector not found, taking screenshot anyway');
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Take full-page screenshot
  await pageMobile.screenshot({
    path: join(artifactsDir, 'gallery-mobile-390px.png'),
    fullPage: true,
  });
  console.log('Mobile screenshot (390px) saved');
  
  await pageMobile.close();
  
  // Test at desktop width (1280px)
  const pageDesktop = await browser.newPage();
  
  // Capture console messages
  pageDesktop.on('console', msg => console.log('Browser console:', msg.text()));
  pageDesktop.on('pageerror', error => console.error('Page error:', error));
  
  await pageDesktop.setViewport({ width: 1280, height: 800 });
  await pageDesktop.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  try {
    await pageDesktop.waitForSelector('.gallery-page', { timeout: 5000 });
  } catch (e) {
    console.log('Warning: .gallery-page selector not found, taking screenshot anyway');
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await pageDesktop.screenshot({
    path: join(artifactsDir, 'gallery-desktop-1280px.png'),
    fullPage: true,
  });
  console.log('Desktop screenshot (1280px) saved');
  
  // Count cards rendered
  const cardCount = await pageDesktop.evaluate(() => {
    return document.querySelectorAll('.gallery-item').length;
  });
  console.log(`Total cards rendered: ${cardCount}`);
  
  // Get card details
  const cards = await pageDesktop.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    return items.map(item => {
      const name = item.querySelector('.gallery-item-name')?.textContent?.trim() || 'Unknown';
      const hasCard = !!item.querySelector('.gallery-item-card > *');
      const isEmpty = item.querySelector('.empty') !== null;
      return { name, hasCard, isEmpty };
    });
  });
  
  console.log('\nCard rendering status:');
  cards.forEach(card => {
    const status = card.isEmpty ? 'empty' : card.hasCard ? 'rendered' : 'missing';
    console.log(`  ${card.name}: ${status}`);
  });
  
  await pageDesktop.close();
} catch (error) {
  console.error('Error during testing:', error);
} finally {
  await browser.close();
}

console.log('\nScreenshots saved to:', artifactsDir);
