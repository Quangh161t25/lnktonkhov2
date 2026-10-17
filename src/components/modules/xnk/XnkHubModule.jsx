import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Star, 
  HelpCircle, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  PackageSearch, 
  Building2, 
  Users,
  Lightbulb,
  Clock,
  Sparkles,
  Ship,
  CalendarClock,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export function XnkHubModule({ onNavigate }) {
  const { canAccessModule } = useAuth();
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'FAVORITES'
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lnk_xnk_favs') || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('lnk_xnk_favs', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  // Groups and Cards configuration matching the exact UI in Screenshot 1
  const groups = [
    {
      groupKey: 'dexuat',
      groupTitle: 'Đề xuất & Ý tưởng sản phẩm',
      cards: [
        {
          id: 'xnk_tongquan',
          title: 'Tổng quan XNK',
          desc: 'Giao diện tổng hợp toàn diện: Ý tưởng, Đặt mẫu, Đơn hàng PO & Tiến độ 8 chặng.',
          icon: Ship,
          iconBg: 'bg-blue-100 text-blue-600',
          route: 'xnk_tongquan',
          helpText: 'Màn hình tổng quan đầy đủ cả 4 phân hệ xuất nhập khẩu dạng tab như ban đầu.'
        },
        {
          id: 'xnk_ytuong',
          title: 'Phiếu đề xuất / Ý tưởng',
          desc: 'Tạo, thảo luận và phê duyệt phiếu đề xuất ý tưởng sản phẩm.',
          icon: FileText,
          iconBg: 'bg-orange-100 text-orange-600',
          route: 'xnk_ytuong',
          helpText: 'Dùng để thu thập ý tưởng mới, đính kèm link 1688/Taobao và trình cấp trên phê duyệt.'
        },
        {
          id: 'xnk_donhang',
          title: 'Đơn đặt hàng (PO)',
          desc: 'Tạo PO, gửi đối tác xưởng, theo dõi 8 chặng tiến độ & trạng thái.',
          icon: ShoppingCart,
          iconBg: 'bg-indigo-100 text-indigo-600',
          route: 'xnk_donhang',
          helpText: 'Lên đơn đặt hàng số lượng lớn, theo dõi thanh toán cọc xưởng và ngày về kho.'
        },
        {
          id: 'xnk_tiendo',
          title: 'Báo cáo & Tiến độ 8 chặng',
          desc: 'Thống kê quy trình: Cọc ➔ Duyệt TK ➔ SX ➔ Chờ ship ➔ Vận chuyển QT ➔ Hải quan ➔ Về kho.',
          icon: BarChart3,
          iconBg: 'bg-purple-100 text-purple-600',
          route: 'xnk_tiendo',
          helpText: 'Bảng Kanban & biểu đồ tiến độ trực quan theo thời gian thực của các lô hàng.'
        }
      ]
    },
    {
      groupKey: 'ncc',
      groupTitle: 'Quản lý & đánh giá NCC',
      cards: [
        {
          id: 'xnk_mau',
          title: 'Đặt mẫu thử & Đánh giá NCC',
          desc: 'Đặt mẫu về, tải ảnh mẫu thực tế, đánh giá cải tiến, Sếp duyệt.',
          icon: PackageSearch,
          iconBg: 'bg-emerald-100 text-emerald-600',
          route: 'xnk_mau',
          helpText: 'So sánh chất lượng sản phẩm mẫu giữa các nhà cung cấp trước khi sản xuất hàng loạt.'
        },
        {
          id: 'xnk_ncc',
          title: 'Danh sách NCC',
          desc: 'Quản lý danh sách nhà cung cấp, xưởng sản xuất, liên hệ & uy tín.',
          icon: Building2,
          iconBg: 'bg-sky-100 text-sky-600',
          route: 'xnk_ncc',
          helpText: 'Danh sách thông tin liên lạc và hồ sơ đối tác xưởng sản xuất, nhà cung cấp.'
        }
      ]
    },
    {
      groupKey: 'kehoachnhap',
      groupTitle: 'Kế hoạch nhập hàng',
      cards: [
        {
          id: 'xnk_dubaonhap',
          title: 'Dự báo nhập hàng',
          desc: 'Dự báo điểm đặt hàng (ROP), số ngày hết hàng và lượng cần nhập.',
          icon: TrendingUp,
          iconBg: 'bg-purple-100 text-purple-600',
          route: 'xnk_dubaonhap',
          helpText: 'Tính lượng cần nhập dựa trên tồn kho và tốc độ bán 3 tháng cao nhất, làm căn cứ lên ý tưởng / PO.'
        },
        {
          id: 'xnk_dukien',
          title: 'Dự kiến hàng về',
          desc: 'Theo dõi các đơn hàng dự kiến về kho và trạng thái giao hàng.',
          icon: CalendarClock,
          iconBg: 'bg-amber-100 text-amber-600',
          route: 'xnk_dukien',
          helpText: 'Danh sách hàng đang trên đường, ngày dự kiến về và tình trạng kiểm định nhập kho.'
        }
      ]
    }
  ];

  // Filter cards by search query and favorite status
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return groups.map(g => {
      const matchedCards = g.cards.filter(c => {
        if (!canAccessModule(c.route)) {
          return false;
        }
        if (activeFilter === 'FAVORITES' && !favorites.includes(c.id)) {
          return false;
        }
        if (q) {
          const matchTitle = c.title.toLowerCase().includes(q);
          const matchDesc = c.desc.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      });

      return {
        ...g,
        cards: matchedCards
      };
    }).filter(g => g.cards.length > 0);
  }, [groups, searchQuery, activeFilter, favorites, canAccessModule]);

  return (
    <div className="space-y-5">
      {/* 1. Header Control Bar (matching Screenshot 1) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Buttons: Quay lại, Tất cả, Đánh dấu */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('home')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Quay lại Trang chủ"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Quay lại</span>
            </button>

            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              Tất cả
            </button>

            <button
              onClick={() => setActiveFilter('FAVORITES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeFilter === 'FAVORITES'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${activeFilter === 'FAVORITES' ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
              <span>Đánh dấu</span>
              {favorites.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded-full font-bold ml-0.5">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>

          {/* Right: Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm module theo tên hoặc mô tả.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* 2. Groups of Modules Cards (matching Screenshot 1) */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-sm font-semibold text-slate-500">
            Không tìm thấy module nào phù hợp với bộ lọc tìm kiếm
          </p>
          <button
            onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
            className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Xem tất cả module
          </button>
        </div>
      ) : (
        filteredGroups.map((group) => (
          <div key={group.groupKey} className="space-y-3">
            {/* Group Title with subtle divider */}
            <div className="flex items-center gap-3">
              <h2 className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-wide">
                {group.groupTitle}
              </h2>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Cards Grid: 2 columns on tablet/desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {group.cards.map((card) => {
                const IconComponent = card.icon;
                const isFav = favorites.includes(card.id);

                return (
                  <div
                    key={card.id}
                    onClick={() => onNavigate(card.route)}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-400 transition cursor-pointer flex items-start gap-4 group relative"
                  >
                    {/* Left Icon Square */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${card.iconBg}`}>
                      <IconComponent className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                    </div>

                    {/* Middle: Title & Description */}
                    <div className="flex-1 min-w-0 pr-10">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {card.desc}
                      </p>
                    </div>

                    {/* Right: Star Favorite Button & Help Icon */}
                    <div className="absolute right-4 top-4 flex flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, card.id)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                        title={isFav ? 'Bỏ đánh dấu' : 'Đánh dấu module'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      <div 
                        className="text-slate-300 hover:text-slate-500 cursor-help"
                        title={card.helpText}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
