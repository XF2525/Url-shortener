const { readData, writeData } = require('./cache');
const logger = require('./logger');

const URLS_FILE = 'data/urls.json';
const ANALYTICS_FILE = 'data/analytics.json';

// Clean up old URLs and analytics data
const cleanupOldData = async (daysToKeep = 365) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        // Clean URLs
        const urlData = await readData(URLS_FILE);
        let removedUrls = 0;
        
        for (const [shortCode, urlInfo] of Object.entries(urlData)) {
            const lastAccessed = new Date(urlInfo.lastAccessed || urlInfo.createdAt);
            if (lastAccessed < cutoffDate && urlInfo.clicks === 0) {
                delete urlData[shortCode];
                removedUrls++;
            }
        }
        
        if (removedUrls > 0) {
            await writeData(URLS_FILE, urlData);
            logger.info(`Removed ${removedUrls} unused URLs older than ${daysToKeep} days`);
        }
        
        // Clean Analytics
        const analyticsData = await readData(ANALYTICS_FILE);
        let cleanedAnalytics = 0;
        
        for (const [shortCode, analytics] of Object.entries(analyticsData)) {
            if (!urlData[shortCode]) {
                // Remove analytics for non-existent URLs
                delete analyticsData[shortCode];
                cleanedAnalytics++;
            } else if (analytics.history && Array.isArray(analytics.history)) {
                // Remove old analytics entries
                const originalLength = analytics.history.length;
                analytics.history = analytics.history.filter(entry => 
                    new Date(entry.timestamp) >= cutoffDate
                );
                
                if (analytics.history.length < originalLength) {
                    analyticsData[shortCode] = analytics;
                    cleanedAnalytics++;
                }
            }
        }
        
        if (cleanedAnalytics > 0) {
            await writeData(ANALYTICS_FILE, analyticsData);
            logger.info(`Cleaned analytics for ${cleanedAnalytics} URLs`);
        }
        
        return {
            removedUrls,
            cleanedAnalytics
        };
    } catch (error) {
        logger.error('Error during cleanup:', error);
        throw error;
    }
};

// Clean up temporary files
const cleanupTempFiles = async () => {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const tempDir = path.join(process.cwd(), 'temp');
        const files = await fs.readdir(tempDir).catch(() => []);
        
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        let removedFiles = 0;
        
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath).catch(() => null);
            
            if (stats && stats.mtime.getTime() < cutoffTime) {
                await fs.unlink(filePath).catch(() => {});
                removedFiles++;
            }
        }
        
        if (removedFiles > 0) {
            logger.info(`Removed ${removedFiles} temporary files`);
        }
        
        return removedFiles;
    } catch (error) {
        logger.error('Error cleaning temporary files:', error);
        return 0;
    }
};

module.exports = {
    cleanupOldData,
    cleanupTempFiles
};
