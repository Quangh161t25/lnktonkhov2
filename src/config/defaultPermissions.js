export const DEFAULT_PERMISSIONS = {
  version: 2,
  modules: {
    home: "Trang chủ",
    tongquan: "Tổng quan",
    nhap: "Danh sách nhập",
    dukien: "Dự kiến hàng về",
    xuat: "Danh sách xuất",
    chuyenkho: "Điều chuyển kho",
    sanpham: "Danh sách sản phẩm",
    sanphamkho: "Danh sách sản phẩm kho",
    cngiasp: "CN Giá SP",
    lendon: "Lên đơn",
    ton_npp: "Tồn NPP",
    doisoat: "Đối soát",
    nhanvien: "Danh sách nhân viên",
    khachhang: "Danh sách khách hàng",
    dubaonhap: "Dự báo nhập hàng",
    caidat: "Cài đặt & Phân quyền"
  },
  roles: {
    ADMIN: {
      modules: [
        "home", "tongquan", "nhap", "dukien", "xuat", "chuyenkho", "sanpham", "sanphamkho", "cngiasp", "lendon",
        "ton_npp", "doisoat", "nhanvien", "khachhang", "dubaonhap", "caidat"
      ],
      actions: [
        "sanpham.viewDetail", "nx.manualAdd", "nx.upload", "nx.confirmWarehouse", "nx.delete",
        "sanpham.manage", "cngiasp.manage", "lendon.manage", "doisoat.manage", "caidat.manage"
      ]
    },
    KT: {
      modules: [
        "home", "tongquan", "nhap", "dukien", "xuat", "chuyenkho", "sanpham", "sanphamkho", "cngiasp", "lendon", "ton_npp", "doisoat"
      ],
      actions: [
        "sanpham.viewDetail", "nx.upload", "cngiasp.manage", "lendon.manage", "doisoat.manage"
      ]
    },
    KHO: {
      modules: [
        "home", "tongquan", "nhap", "dukien", "xuat", "chuyenkho", "sanphamkho", "ton_npp"
      ],
      actions: [
        "sanpham.viewDetail", "nx.confirmWarehouse"
      ]
    },
    NPP: {
      modules: [
        "sanpham", "xuat", "lendon", "ton_npp"
      ],
      actions: []
    },
    KD: {
      modules: [
        "home", "tongquan", "sanpham", "lendon", "ton_npp"
      ],
      actions: [
        "lendon.manage"
      ]
    },
    NVKD: {
      modules: [
        "home", "tongquan", "sanpham", "lendon", "ton_npp"
      ],
      actions: [
        "lendon.manage"
      ]
    }
  },
  dataScopes: {
    NPP: {
      sanpham: "Chỉ xem Ảnh, ID, Tên SP, Tồn cuối của ID SP đã xuất trong XUAT_CT theo ma_kh bằng id tài khoản",
      xuat: "Chỉ xem đơn xuất trong XUAT_CT theo ma_kh bằng id tài khoản",
      lendon: "Chỉ xem đơn lên trong LEN_DON theo ma_kh bằng id tài khoản",
      ton_npp: "Chỉ xem dữ liệu trong TON_NPP theo ma_kh bằng id tài khoản"
    },
    KD: {
      sanpham: "Xem ID, Ten SP, Ton cuoi tong"
    },
    NVKD: {
      nx: "Chỉ xem dữ liệu theo id_nv/nhân viên bằng id tài khoản",
      lendon: "Chỉ xem đơn lên theo id_nv_len_don bằng id tài khoản"
    }
  },
  userRestrictions: {
    KH00206: {
      hiddenProductIds: [
        "TK-0348", "TK-0318", "TK-0320", "TK-0324"
      ]
    }
  },
  userWarehouses: {
    dự: ["KHO 1"],
    NV00024: ["KHO 1"],
    trường: ["KHO 5"],
    NV00032: ["KHO 5"]
  }
};
