export type Lang = 'en' | 'th';
export type Currency = 'THB' | 'USD';

export const THB_USD_RATE = 35;

type Dict = Record<string, string>;

const en: Dict = {
  // Nav groups
  Overview: 'Overview',
  Sales: 'Sales',
  Masters: 'Masters',
  Procurement: 'Procurement',
  Production: 'Production',
  Finance: 'Finance',
  Admin: 'Admin',
  // Nav items
  Dashboard: 'Dashboard',
  'Sales Orders': 'Sales Orders',
  'Artwork & FDA': 'Artwork & FDA',
  Shipments: 'Shipments',
  Items: 'Items',
  'Bill of Materials': 'Bill of Materials',
  Formulations: 'Formulations',
  Customers: 'Customers',
  Suppliers: 'Suppliers',
  'Purchase Orders': 'Purchase Orders',
  Receiving: 'Receiving',
  Inventory: 'Inventory',
  Locations: 'Locations',
  'Mfg Orders': 'Mfg Orders',
  'MRP Planning': 'MRP Planning',
  'Production Floor': 'Production Floor',
  'Work Centers': 'Work Centers',
  Invoicing: 'Invoicing',
  Payments: 'Payments',
  Users: 'Users',
  'Access Requests': 'Access Requests',
  'Audit Trail': 'Audit Trail',
  // Shifts
  'Morning shift': 'Morning shift',
  'Afternoon shift': 'Afternoon shift',
  'Night shift': 'Night shift',
  // Dashboard KPIs
  'Open Sales Orders': 'Open Sales Orders',
  'Active Mfg Orders': 'Active Mfg Orders',
  'Open Purchase Orders': 'Open Purchase Orders',
  'Pending Invoices': 'Pending Invoices',
  // Dashboard sections
  'Production Pipeline': 'Production Pipeline',
  'Recent Sales Orders': 'Recent Sales Orders',
  'Low Stock': 'Low Stock',
  'All stocked up': 'All stocked up',
  // Table headers
  'SO #': 'SO #',
  Pieces: 'Pieces',
  Status: 'Status',
  Date: 'Date',
};

const th: Dict = {
  // Nav groups
  Overview: 'ภาพรวม',
  Sales: 'การขาย',
  Masters: 'ข้อมูลหลัก',
  Procurement: 'การจัดซื้อ',
  Production: 'การผลิต',
  Finance: 'การเงิน',
  Admin: 'ผู้ดูแลระบบ',
  // Nav items
  Dashboard: 'แดชบอร์ด',
  'Sales Orders': 'ใบสั่งขาย',
  'Artwork & FDA': 'อาร์ตเวิร์ค & FDA',
  Shipments: 'การจัดส่ง',
  Items: 'รายการสินค้า',
  'Bill of Materials': 'โครงสร้างสินค้า',
  Formulations: 'สูตรผลิต',
  Customers: 'ลูกค้า',
  Suppliers: 'ซัพพลายเออร์',
  'Purchase Orders': 'ใบสั่งซื้อ',
  Receiving: 'รับสินค้า',
  Inventory: 'คลังสินค้า',
  Locations: 'ตำแหน่งจัดเก็บ',
  'Mfg Orders': 'ใบสั่งผลิต',
  'MRP Planning': 'วางแผน MRP',
  'Production Floor': 'พื้นการผลิต',
  'Work Centers': 'ศูนย์งาน',
  Invoicing: 'ใบแจ้งหนี้',
  Payments: 'การชำระเงิน',
  Users: 'ผู้ใช้งาน',
  'Access Requests': 'คำขอสิทธิ์',
  'Audit Trail': 'บันทึกการใช้งาน',
  // Shifts
  'Morning shift': 'กะเช้า',
  'Afternoon shift': 'กะบ่าย',
  'Night shift': 'กะดึก',
  // Dashboard KPIs
  'Open Sales Orders': 'ใบสั่งขายที่เปิดอยู่',
  'Active Mfg Orders': 'ใบผลิตที่ดำเนินการ',
  'Open Purchase Orders': 'ใบสั่งซื้อที่เปิดอยู่',
  'Pending Invoices': 'ใบแจ้งหนี้รอชำระ',
  // Dashboard sections
  'Production Pipeline': 'ไปป์ไลน์การผลิต',
  'Recent Sales Orders': 'ใบสั่งขายล่าสุด',
  'Low Stock': 'สต็อกต่ำ',
  'All stocked up': 'สต็อกเพียงพอ',
  // Table headers
  'SO #': 'เลขที่ SO',
  Pieces: 'จำนวน',
  Status: 'สถานะ',
  Date: 'วันที่',
};

export const DICTS: Record<Lang, Dict> = { en, th };
