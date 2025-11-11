/**
 * Auto-generation Utilities
 *
 * Utilities to auto-generate ASCII art names and manifest.json
 * from resume data, reducing manual configuration for users.
 */

import figlet from 'figlet';
import { writeFileSync } from 'fs';
import { promisify } from 'util';

const figletAsync = promisify(figlet);

/**
 * Generate ASCII art for a name using figlet
 * @param {string} name - Name to convert to ASCII art
 * @param {string} font - Figlet font to use (default: 'Standard')
 * @returns {Promise<string>} ASCII art string
 */
export async function generateASCIIName(name, font = 'Standard') {
  try {
    const ascii = await figletAsync(name, {
      font: font,
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    });
    return ascii;
  } catch (error) {
    console.error('Error generating ASCII art:', error);
    // Fallback to simple name if figlet fails
    return name;
  }
}

/**
 * Generate manifest.json for PWA from resume data
 * @param {Object} resumeData - Parsed resume YAML data
 * @param {string} baseUrl - Base URL for the site
 * @returns {Object} manifest.json object
 */
export function generateManifest(resumeData, baseUrl = '') {
  const name = resumeData.cv?.name || 'Portfolio';
  const shortName = name.split(' ')[0] || 'Portfolio';

  // Extract description from summary or intro
  let description = 'Interactive terminal-style portfolio';
  if (resumeData.cv?.sections?.intro && resumeData.cv.sections.intro.length > 0) {
    description = resumeData.cv.sections.intro[0];
    // Truncate if too long
    if (description.length > 132) {
      description = description.substring(0, 132) + '...';
    }
  }

  return {
    name: `${name} - Terminal Portfolio`,
    short_name: `${shortName}'s Portfolio`,
    description: description,
    start_url: baseUrl || '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#00FF00',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png'
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png'
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png'
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png'
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png'
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
    categories: ['portfolio', 'development', 'professional']
  };
}

/**
 * Save ASCII art name to file
 * @param {string} ascii - ASCII art string
 * @param {string} outputPath - Path to save the file
 */
export function saveASCIIName(ascii, outputPath) {
  try {
    writeFileSync(outputPath, ascii, 'utf8');
    console.log(`✅ ASCII art name saved to ${outputPath}`);
  } catch (error) {
    console.error('Error saving ASCII art name:', error);
  }
}

/**
 * Save manifest.json to file
 * @param {Object} manifest - Manifest object
 * @param {string} outputPath - Path to save the file
 */
export function saveManifest(manifest, outputPath) {
  try {
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`✅ Manifest.json saved to ${outputPath}`);
  } catch (error) {
    console.error('Error saving manifest.json:', error);
  }
}
