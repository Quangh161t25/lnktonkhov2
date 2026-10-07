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
  }
};
