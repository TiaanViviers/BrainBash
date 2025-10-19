/**
 * Avatars Controller
 * 
 * Handles HTTP requests for avatar-related operations.
 * Provides endpoints to list available avatars and serve avatar images.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the avatars directory in the client
const AVATARS_DIR = path.join(__dirname, '../../../client/src/data/avatars');

/**
 * Get list of available avatars
 * GET /api/avatars
 */
export async function getAvatars(req, res, next) {
  try {
    // Read the avatars directory
    const files = await fs.readdir(AVATARS_DIR);
    
    // Filter for image files and create avatar objects
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    const avatars = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => {
        const name = path.parse(file).name;
        const ext = path.extname(file).toLowerCase();
        
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          filename: file,
          url: `/api/avatars/${file}`,
          extension: ext
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      ok: true,
      avatars,
      count: avatars.length
    });
  } catch (error) {
    console.error('Error reading avatars directory:', error);
    next(error);
  }
}

/**
 * Serve avatar image file
 * GET /api/avatars/:filename
 */
export async function getAvatarImage(req, res, next) {
  try {
    const { filename } = req.params;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid filename'
      });
    }
    
    let actualFilename = filename;
    
    if (!path.extname(filename)) {
      try {
        const files = await fs.readdir(AVATARS_DIR);
        const foundFile = files.find(file => 
          file.toLowerCase() === filename.toLowerCase() + '.png' 
        );
        
        if (foundFile) {
          actualFilename = foundFile;
        }
      } catch (error) {
      }
    }
    
    const filePath = path.join(AVATARS_DIR, actualFilename);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        ok: false,
        error: 'Avatar not found'
      });
    }
    
    const ext = path.extname(actualFilename).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving avatar image:', error);
    next(error);
  }
}
