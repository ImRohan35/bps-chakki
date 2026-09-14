const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_DIR = process.env.DATA_DIR || DEFAULT_DATA_DIR;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonCollection {
  constructor(collectionName) {
    this.name = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.defaultFilePath = path.join(DEFAULT_DATA_DIR, `${collectionName}.json`);
    this.init();
  }

  init() {
    if (!fs.existsSync(this.filePath)) {
      if (this.filePath !== this.defaultFilePath && fs.existsSync(this.defaultFilePath)) {
        try {
          fs.copyFileSync(this.defaultFilePath, this.filePath);
          return;
        } catch (e) {}
      }
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content || '[]');
    } catch (err) {
      console.error(`Error reading ${this.name}:`, err);
      return [];
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Error writing ${this.name}:`, err);
      return false;
    }
  }

  find(query = {}) {
    const items = this.read();
    if (!query) return items;
    if (typeof query === 'function') {
      return items.filter(query);
    }
    if (Object.keys(query).length === 0) {
      return items;
    }
    return items.filter(item => {
      for (const [key, val] of Object.entries(query)) {
        if (typeof val === 'function') {
          if (!val(item[key])) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
      return true;
    });
  }

  findOne(query = {}) {
    const items = this.read();
    if (!query) return null;
    if (typeof query === 'function') {
      return items.find(query) || null;
    }
    return items.find(item => {
      for (const [key, val] of Object.entries(query)) {
        if (typeof val === 'function') {
          if (!val(item[key])) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  findById(id) {
    const items = this.read();
    return items.find(item => item._id === id || item.id === id) || null;
  }

  insertOne(doc) {
    const items = this.read();
    const newDoc = {
      _id: doc._id || doc.id || 'bps_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    items.push(newDoc);
    this.write(items);
    return newDoc;
  }

  insertMany(docs) {
    const items = this.read();
    const newDocs = docs.map(doc => ({
      _id: doc._id || doc.id || 'bps_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    }));
    items.push(...newDocs);
    this.write(items);
    return newDocs;
  }

  updateOne(query, update) {
    const items = this.read();
    const index = items.findIndex(item => {
      for (const [key, val] of Object.entries(query)) {
        if (item[key] !== val) return false;
      }
      return true;
    });

    if (index === -1) return null;

    const current = items[index];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };
    items[index] = updated;
    this.write(items);
    return updated;
  }

  updateById(id, update) {
    const items = this.read();
    const index = items.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;

    const current = items[index];
    const updated = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString()
    };
    items[index] = updated;
    this.write(items);
    return updated;
  }

  deleteOne(query) {
    let items = this.read();
    const index = items.findIndex(item => {
      for (const [key, val] of Object.entries(query)) {
        if (item[key] !== val) return false;
      }
      return true;
    });

    if (index === -1) return false;
    items.splice(index, 1);
    this.write(items);
    return true;
  }

  deleteById(id) {
    let items = this.read();
    const initialLen = items.length;
    items = items.filter(item => item._id !== id && item.id !== id);
    if (items.length !== initialLen) {
      this.write(items);
      return true;
    }
    return false;
  }

  count(query = {}) {
    return this.find(query).length;
  }
}

const db = {
  Users: new JsonCollection('users'),
  Products: new JsonCollection('products'),
  Orders: new JsonCollection('orders'),
  Reviews: new JsonCollection('reviews'),
  Offers: new JsonCollection('offers'),
  ReturnRequests: new JsonCollection('returns'),
  DeliveryAgents: new JsonCollection('delivery_agents'),
  CashSettlements: new JsonCollection('cash_settlements'),
  Settings: new JsonCollection('settings'),
  Categories: new JsonCollection('categories'),
  AuditLogs: new JsonCollection('audit_logs'),
  StockHistory: new JsonCollection('stock_history'),
  Inquiries: new JsonCollection('inquiries'),
  Notifications: new JsonCollection('notifications'),
  Tickets: new JsonCollection('tickets'),
  LoyaltyLedger: new JsonCollection('loyalty_ledger'),
  WalletLedger: new JsonCollection('wallet_ledger'),
  Replacements: new JsonCollection('replacements')
};

module.exports = db;
