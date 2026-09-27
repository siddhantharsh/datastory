import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 3500)));

  const artifactDir = '/home/sid/.gemini/antigravity-ide/brain/17568a92-62d5-4018-8292-016c2bb8ecaf';

  // 1. Hero Screenshot after mascot text reveal & caret movement
  await page.screenshot({ path: path.join(artifactDir, 'verify_hero_caret.png') });
  console.log('Saved verify_hero_caret.png');

  // 2. Scroll to Frame 1 (Prompt box)
  await page.evaluate(() => window.scrollTo(0, 6200));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await page.screenshot({ path: path.join(artifactDir, 'verify_frame1_prompt.png') });

  // 3. Scroll to Frame 2 (Column Schema Tokens & Matrix Embedding)
  await page.evaluate(() => window.scrollTo(0, 7200));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await page.screenshot({ path: path.join(artifactDir, 'verify_frame2_schema.png') });

  // 4. Scroll to Frame 3 (9 Vector Columns & Pearson Correlation Bezier Arcs)
  await page.evaluate(() => window.scrollTo(0, 8600));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await page.screenshot({ path: path.join(artifactDir, 'verify_frame3_arcs.png') });

  // 5. Scroll to Frame 4 (3D Perspective Stack & 4 Right Feature Cards)
  await page.evaluate(() => window.scrollTo(0, 10400));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await page.screenshot({ path: path.join(artifactDir, 'verify_frame4_stack.png') });

  // 6. Scroll to Section 06 Mobile Export Phone Showcase
  await page.evaluate(() => window.scrollTo(0, 14200));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  await page.screenshot({ path: path.join(artifactDir, 'verify_mobile_phone.png') });

  await browser.close();
})();



