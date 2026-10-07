export const CONFIG = {
  spreadsheetId: "1qo4DMUGNd-D7n2hbrRiGIIkR24mArDoKZSeYjdkP8hQ",
  authSheetName: "DSNV",
  nxSheetName: "NX_CT",
  nhapSheetName: "NHAP_CT",
  expectedSheetName: "DU_KIEN_HANG_VE",
  xuatSheetName: "XUAT_CT",
  transferSheetName: "CHUYEN_KHO_CT",
  productSheetName: "DS_SP",
  warehouseProductSheetName: "DS_SP_KHO",
  tonNppSheetName: "TON_NPP",
  reconciliationSheetName: "DOI_SOAT",
  giuHangSheetName: "GIU_HANG",
  kiemKhoSheetName: "KIEM_KHO",
  caiDatSheetName: "CAI_DAT",
  cngiaspSheetName: "CN_GIA_SP",
  lenDonSheetName: "LEN_DON",
  lichSuSheetName: "LICH_SU",
  permissionsFile: "permissions.json"
};

export const DEFAULT_APP_SETTINGS = {
  appName: "LNK TỒN KHO - ERP SYSTEM",
  appVersion: "2.0.0",
  pageSize: 200,
  warehouses: ['KHO 1', 'KHO 2', 'KHO 3', 'KHO 4', 'KHO 5'],
  defaultWarehouse: 'KHO 1',
  lowStockThreshold: 10,
  allowNegativeStock: 'CANH_BAO',
  holdOrderExpiryDays: 7,
  autoRefreshIntervalSec: 300,
  kiemKhoStatuses: ['Chờ kiểm', 'Đã kiểm', 'Lệch kho', 'Hoàn thành'],
  xuatConfirmStatuses: ['Đã nhặt hàng', 'Đã lên xe', 'Hoàn thành'],
  dukienStatuses: [
    'Đang làm việc',
    'Đã đặt hàng',
    'Chưa giao (Pending)',
    'Đang trên đường (In Transit)',
    'Đã về kho - Đang kiểm (Arrived - Checking)',
    'Chờ kiểm định',
    'Đã nhập kho xong (Completed)',
    'Bị hoãn (Delayed)'
  ],
  lastSyncedTime: null,
  syncSource: 'LOCAL'
};

export const DUKIEN_STATUS_OPTIONS = [
  'Đang làm việc',
  'Đã đặt hàng',
  'Chưa giao (Pending)',
  'Đang trên đường (In Transit)',
  'Đã về kho - Đang kiểm (Arrived - Checking)',
  'Chờ kiểm định',
  'Đã nhập kho xong (Completed)',
  'Bị hoãn (Delayed)'
];

export const MODULE_DEFINITIONS = [
  { key: 'home', name: 'Trang chủ', desc: 'Trung tâm điều hướng lối tắt hệ thống', icon: 'Home', color: 'blue' },
  { key: 'tongquan', name: 'Tổng quan', desc: 'Báo cáo & phân tích số liệu xuất nhập tồn', icon: 'BarChart3', color: 'indigo' },
  { key: 'nhap', name: 'Danh sách nhập', desc: 'Xem & quản lý phiếu nhập kho', icon: 'ArrowDownToLine', color: 'blue' },
  { key: 'dukien', name: 'Dự kiến hàng về', desc: 'Theo dõi đơn hàng dự kiến về kho', icon: 'CalendarClock', color: 'amber' },
  { key: 'xuat', name: 'Danh sách xuất', desc: 'Xem & quản lý phiếu xuất kho', icon: 'ArrowUpFromLine', color: 'orange' },
  { key: 'chuyenkho', name: 'Điều chuyển kho', desc: 'Điều chuyển hàng giữa các kho', icon: 'ArrowLeftRight', color: 'cyan' },
  { key: 'sanpham', name: 'Danh sách sản phẩm', desc: 'Danh mục sản phẩm & tồn kho tổng', icon: 'Package', color: 'emerald' },
  { key: 'sanphamkho', name: 'Sản phẩm kho', desc: 'Tồn kho chi tiết theo từng kho', icon: 'Warehouse', color: 'indigo' },
  { key: 'cngiasp', name: 'CN Giá SP', desc: 'Cập nhật & quản lý bảng giá sản phẩm', icon: 'BadgePercent', color: 'emerald' },
  { key: 'lendon', name: 'Lên đơn', desc: 'Lên đơn bán hàng & giá lấy từ CN Giá SP', icon: 'ShoppingCart', color: 'amber' },
  { key: 'ton_npp', name: 'Tồn NPP', desc: 'Báo cáo tồn Nhà phân phối', icon: 'Building2', color: 'teal' },
  { key: 'doisoat', name: 'Đối soát', desc: 'Đối chiếu tồn hệ thống với MISA', icon: 'Scale', color: 'rose' },
  { key: 'nhanvien', name: 'Danh sách nhân viên', desc: 'Danh bạ nhân viên từ DSNV', icon: 'Users', color: 'sky' },
  { key: 'khachhang', name: 'Danh sách khách hàng', desc: 'Khách hàng NPP và NCC', icon: 'UserCheck', color: 'violet' },
  { key: 'dubaonhap', name: 'Dự báo nhập hàng', desc: 'Dự báo điểm đặt hàng (ROP), số ngày hết hàng và lượng cần nhập', icon: 'TrendingUp', color: 'purple' },
  { key: 'caidat', name: 'Cài đặt & Phân quyền', desc: 'Quản trị hệ thống & thiết kế phân quyền', icon: 'Settings', color: 'slate' }
];

export const AVAILABLE_ACTIONS = [
  { key: 'nx.manualAdd', name: 'Thêm thủ công đơn Nhập / Xuất', desc: 'Cho phép tạo mới dòng phiếu nhập xuất bằng tay' },
  { key: 'nx.upload', name: 'Tải lên dữ liệu Excel', desc: 'Cho phép upload file Excel nhập/xuất/trả lại' },
  { key: 'nx.confirmWarehouse', name: 'Xác nhận trạng thái kho', desc: 'Cập nhật trạng thái: Đã nhặt hàng, Đã lên xe, Hoàn thành' },
  { key: 'nx.delete', name: 'Xóa đơn hàng / Bản ghi Tồn NPP', desc: 'Cho phép xóa đơn Nhập, Xuất, Tồn NPP và các bản ghi chi tiết' },
  { key: 'sanpham.manage', name: 'Quản lý Sản phẩm', desc: 'Thêm mới, sửa thông tin & giá bán sản phẩm' },
  { key: 'cngiasp.manage', name: 'Quản lý bảng giá SP', desc: 'Thêm mới, sửa, xóa và tải lên file giá sản phẩm' },
  { key: 'lendon.manage', name: 'Quản lý Lên đơn', desc: 'Thêm mới, sửa, xóa và tải lên đơn hàng' },
  { key: 'doisoat.manage', name: 'Quản lý Đối soát', desc: 'Thao tác tải lên và đối chiếu chênh lệch MISA' },
  { key: 'caidat.manage', name: 'Quản trị Phân quyền', desc: 'Thiết kế vai trò và lưu cấu hình phân quyền' }
];
