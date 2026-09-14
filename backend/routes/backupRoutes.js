const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate, adminOnly } = require('../middleware/auth');
const backupService = require('../services/backupService');

router.use(authenticate, adminOnly);

/**
 * POST /api/admin/system/backup
 * Triggers a full timestamped JSON backup of all collections
 */
router.post('/backup', (req, res) => {
  try {
    const backup = backupService.createDatabaseBackup(req.user?.name || 'Admin');
    res.status(201).json({
      success: true,
      message: `Database backup created successfully (${backup.sizeKb} KB, ${backup.totalRecords} records).`,
      backup
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to create database backup: ${err.message}`
    });
  }
});

/**
 * GET /api/admin/system/backups
 * Lists all existing database backups
 */
router.get('/backups', (req, res) => {
  try {
    const backups = backupService.listDatabaseBackups();
    res.json({
      success: true,
      count: backups.length,
      backups
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to list database backups'
    });
  }
});

/**
 * GET /api/admin/system/backups/:fileName/download
 * Download a specific backup JSON file
 */
router.get('/backups/:fileName/download', (req, res) => {
  try {
    const { fileName } = req.params;
    // Security check: strictly validate filename format to prevent path traversal
    if (!fileName || !fileName.startsWith('bps_backup_') || !fileName.endsWith('.json') || fileName.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid backup filename requested.' });
    }

    const filePath = path.join(backupService.BACKUP_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found.' });
    }

    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to download backup' });
  }
});

module.exports = router;
