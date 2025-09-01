const fs = require('fs').promises;
const path = require('path');
const { readData, writeData, getCacheInstance } = require('./cache');
const logger = require('./logger');

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 7; // Keep last 7 backups

// Ensure backup directory exists
const ensureBackupDir = async () => {
    try {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
    } catch (error) {
        logger.error('Error creating backup directory:', error);
    }
};

// Create a backup of all data
const backup = async () => {
    try {
        await ensureBackupDir();
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
        
        // Get all data from cache
        const cache = getCacheInstance();
        const backupData = {
            timestamp: new Date().toISOString(),
            urlDatabase: Array.from(cache.urlDatabase),
            analytics: Array.from(cache.analytics),
            urlToShortCode: Array.from(cache.urlToShortCode),
            performanceMetrics: cache.performanceMetrics,
            version: '1.0'
        };
        
        // Write backup file
        await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
        logger.info(`Backup created: ${backupFile}`);
        
        // Clean old backups
        await cleanOldBackups();
        
        return backupFile;
    } catch (error) {
        logger.error('Backup failed:', error);
        throw error;
    }
};

// Remove old backup files
const cleanOldBackups = async () => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (backupFiles.length > MAX_BACKUPS) {
            const filesToDelete = backupFiles.slice(MAX_BACKUPS);
            
            for (const file of filesToDelete) {
                await fs.unlink(path.join(BACKUP_DIR, file));
                logger.info(`Deleted old backup: ${file}`);
            }
        }
    } catch (error) {
        logger.error('Error cleaning old backups:', error);
    }
};

// Restore from a backup file
const restore = async (backupFile) => {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFile);
        const data = await fs.readFile(backupPath, 'utf8');
        const backupData = JSON.parse(data);
        
        // Restore to cache
        const cache = getCacheInstance();
        cache.urlDatabase = new Map(backupData.urlDatabase);
        cache.analytics = new Map(backupData.analytics);
        cache.urlToShortCode = new Map(backupData.urlToShortCode);
        cache.performanceMetrics = backupData.performanceMetrics;
        
        // Save to files
        await cache.saveToFile();
        
        logger.info(`Restored from backup: ${backupFile}`);
        return true;
    } catch (error) {
        logger.error('Restore failed:', error);
        throw error;
    }
};

// List available backups
const listBackups = async () => {
    try {
        await ensureBackupDir();
        const files = await fs.readdir(BACKUP_DIR);
        
        const backups = await Promise.all(
            files
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .map(async (file) => {
                    const stats = await fs.stat(path.join(BACKUP_DIR, file));
                    return {
                        filename: file,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
        );
        
        return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
        logger.error('Error listing backups:', error);
        return [];
    }
};

module.exports = {
    backup,
    restore,
    listBackups,
    cleanOldBackups
};
