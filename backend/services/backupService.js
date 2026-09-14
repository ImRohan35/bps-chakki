const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Creates a complete timestamped backup of all BPS Fresh Mills database collections
 */
function createDatabaseBackup(triggeredBy = 'SYSTEM') {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `bps_backup_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    const snapshot = {
      meta: {
        brand: 'BPS Fresh Mills',
        timestamp: new Date().toISOString(),
        triggeredBy,
        version: '1.0.0'
      },
      collections: {
        Users: db.Users.find(),
        Products: db.Products.find(),
        Orders: db.Orders.find(),
        DeliveryAgents: db.DeliveryAgents.find(),
        CashSettlements: db.CashSettlements.find(),
        ReturnRequests: db.ReturnRequests.find(),
        Tickets: db.Tickets.find(),
        Settings: db.Settings.find(),
        Offers: db.Offers.find(),
        Reviews: db.Reviews.find(),
        Replacements: db.Replacements.find()
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    const stats = fs.statSync(filePath);
    return {
      success: true,
      fileName,
      filePath,
      sizeBytes: stats.size,
      sizeKb: Math.round(stats.size / 1024),
      createdAt: snapshot.meta.timestamp,
      totalRecords: Object.values(snapshot.collections).reduce((sum, arr) => sum + (arr?.length || 0), 0)
    };
  } catch (err) {
    console.error('Backup creation failed:', err);
    throw new Error(`Backup failed: ${err.message}`);
  }
}

/**
 * Lists all existing database backups
 */
function listDatabaseBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json') && f.startsWith('bps_backup_'));
    const backups = files.map(file => {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);
      return {
        fileName: file,
        sizeBytes: stat.size,
        sizeKb: Math.round(stat.size / 1024),
        createdAt: stat.birthtime.toISOString()
      };
    });

    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backups;
  } catch (err) {
    console.error('Error listing backups:', err);
    return [];
  }
}

module.exports = {
  createDatabaseBackup,
  listDatabaseBackups,
  BACKUP_DIR
};
