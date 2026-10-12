import { CONFIG } from './constants';

export const SIMPLE_SHEET_MODULES = {
  nhap: {
    sheetName: () => CONFIG.nhapSheetName,
    range: 'A1:Q60000',
    cacheKey: 'erp_nhap_cache',
    columns: ['id', 'ngay', 'truong', 'mdh', 'ma_kh', 'ten_khach', 'id_sp', 'ten_sp', 'slg', 'don_gia', 'thanh_tien', 'kho', 'id_nv_nhan', 'ghi_chu', 'loai_hinh', 'ngay_dat_hang', 'tinh_trang']
  },
  dukien: {
    sheetName: () => CONFIG.expectedSheetName,
    range: 'A1:M60000',
    cacheKey: 'erp_expected_cache',
    columns: ['id', 'stt', 'ngay_nhap', 'ma_po', 'id_sp', 'ten_sp', 'dvt', 'so_luong_du_kien', 'ngay_ve_du_kien', 'trang_thai', 'slg_thuc_nhan', 'chenh_lech', 'ghi_chu']
  },
  xuat: {
    sheetName: () => CONFIG.xuatSheetName,
    range: 'A1:O60000',
    cacheKey: 'erp_xuat_cache',
    columns: ['id', 'ngay', 'truong', 'mdh', 'ma_kh', 'ten_khach', 'id_sp', 'ten_sp', 'slg', 'don_gia', 'thanh_tien', 'kho', 'id_nv_xuat', 'ghi_chu', 'loai_hinh']
  },
  chuyenkho: {
    sheetName: () => CONFIG.transferSheetName,
    range: 'A1:K60000',
    cacheKey: 'erp_transfer_cache',
    columns: ['id', 'ngay', 'mdh', 'id_sp', 'ten_sp', 'slg', 'kho_di', 'kho_nhan', 'ghi_chu', 'tinh_trang', 'trang_thai']
  },
  sanpham: {
    sheetName: () => CONFIG.productSheetName,
    range: 'A1:F10000',
    cacheKey: 'erp_product_cache',
    columns: ['id', 'ten_sp', 'model', 'anh', 'gia_ban', 'ghi_chu']
  },
  sanphamkho: {
    sheetName: () => CONFIG.warehouseProductSheetName,
    range: 'A1:F50000',
    cacheKey: 'erp_warehouse_product_cache',
    columns: ['id', 'kho', 'id_sp', 'ten_sp', 'ton_dau', 'ton_sau']
  },
  ton_npp: {
    sheetName: () => CONFIG.tonNppSheetName,
    range: 'A1:E60000',
    cacheKey: 'erp_ton_npp_cache',
    columns: ['id', 'ngay', 'ma_kh', 'id_sp', 'ton_cuoi']
  },
  doisoat: {
    sheetName: () => CONFIG.reconciliationSheetName,
    range: 'A1:C50000',
    cacheKey: 'erp_reconciliation_cache',
    columns: ['id', 'ten_sp', 'ton_misa']
  },
  cngiasp: {
    sheetName: () => CONFIG.cngiaspSheetName || 'CN_GIA_SP',
    range: 'A1:K60000',
    cacheKey: 'erp_cngiasp_cache',
    columns: ['id', 'ngay_cap_nhat', 'ma_sp', 'ten_sp', 'gia_nhap', 'gia_ban', 'gia_cu', 'chenh_lech', 'nguoi_cap_nhat', 'ghi_chu', 'trang_thai']
  },
  lendon: {
    sheetName: () => CONFIG.lenDonSheetName || 'LEN_DON',
    range: 'A1:Q60000',
    cacheKey: 'erp_lendon_cache',
    columns: ['id', 'ngay', 'truong', 'mdh', 'ma_kh', 'ten_khach', 'id_sp', 'ten_sp', 'slg', 'don_gia', 'thanh_tien', 'kho', 'id_nv_len_don', 'ghi_chu', 'loai_hinh', 'slg_thuc_te', 'trang_thai']
  },
  caidat: {
    sheetName: () => CONFIG.caiDatSheetName || 'CAI_DAT',
    range: 'A1:H1000',
    cacheKey: 'erp_caidat_cache',
    columns: ['id', 'ten_thiet_lap', 'gia_tri', 'nhom', 'kieu_du_lieu', 'mo_ta', 'ngay_cap_nhat', 'nguoi_cap_nhat']
  },
  lichsu: {
    sheetName: () => CONFIG.lichSuSheetName || 'LICH_SU',
    range: 'A1:L50000',
    cacheKey: 'erp_lichsu_cache',
    columns: ['id', 'thoi_gian', 'nguoi_dung', 'vai_tro', 'phan_he', 'thao_tac', 'ma_don', 'doi_tuong', 'tom_tat', 'du_lieu_cu', 'du_lieu_moi', 'trang_thai_khoi_phuc']
  },
  xnk_ytuong: {
    sheetName: () => CONFIG.xnkYtuongSheetName || 'XNK_Y_TUONG',
    range: 'A1:J20000',
    cacheKey: 'erp_xnk_ytuong_cache',
    columns: ['id_y_tuong', 'ngay_tao', 'nguoi_tao', 'sku_du_kien', 'ten_sp', 'mo_ta', 'link_tham_khao', 'trang_thai', 'nguoi_duyet', 'ghi_chu']
  },
  xnk_mau: {
    sheetName: () => CONFIG.xnkMauSheetName || 'XNK_MAU',
    range: 'A1:L20000',
    cacheKey: 'erp_xnk_mau_cache',
    columns: ['id_mau', 'id_y_tuong', 'ten_ncc', 'lien_he_ncc', 'gia_mau', 'ngay_dat_mau', 'ngay_nhan_mau', 'link_anh_mau', 'danh_gia_cai_tien', 'danh_gia_xep_hang', 'trang_thai_duyet', 'ghi_chu']
  },
  xnk_donhang: {
    sheetName: () => CONFIG.xnkDonHangSheetName || 'XNK_DON_HANG',
    range: 'A1:S30000',
    cacheKey: 'erp_xnk_donhang_cache',
    columns: ['ma_po', 'id_mau', 'sku', 'ten_sp', 'ten_ncc', 'so_luong', 'don_gia', 'tong_tien', 'tien_coc', 'ngay_dat_hang', 'ngay_sx_xong', 'tracking_van_chuyen', 'ngay_gui_hang', 'ngay_thong_quan', 'ngay_kho_nhan', 'slg_thuc_nhan', 'ke_hoach_ban', 'tinh_trang_cuoi', 'ghi_chu']
  }
};
