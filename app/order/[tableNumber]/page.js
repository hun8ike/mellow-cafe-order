'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function OrderPage() {
  const params = useParams();
  const tableNumber = params?.tableNumber || 'counter';

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const { data: catData, error: catError } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (catError) throw catError;

        const { data: itemData, error: itemError } = await supabase
          .from('menu_items')
          .select('*');

        if (itemError) throw itemError;

        setCategories(catData || []);
        setMenuItems(itemData || []);
        if (catData && catData.length > 0) {
          setSelectedCategory(catData[0].id);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
        showNotification('ไม่สามารถโหลดข้อมูลเมนูได้', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateQuantity = (item, delta) => {
    setCart((prevCart) => {
      const currentQty = prevCart[item.id]?.quantity || 0;
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        const newCart = { ...prevCart };
        delete newCart[item.id];
        return newCart;
      }

      return {
        ...prevCart,
        [item.id]: {
          item,
          quantity: newQty,
        },
      };
    });
  };

  const cartArray = Object.values(cart);
  const totalItemsCount = cartArray.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cartArray.reduce(
    (acc, curr) => acc + (curr.item.price || 0) * curr.quantity,
    0
  );

  const handleSendOrder = async () => {
    if (!customerName.trim()) {
      showNotification('กรุณากรอกชื่อของคุณก่อนส่งออเดอร์', 'error');
      return;
    }

    if (cartArray.length === 0) {
      showNotification('กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const orderItems = cartArray.map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        quantity: quantity,
      }));

      const { error } = await supabase.from('orders').insert([
        {
          table_number: tableNumber,
          customer_name: customerName.trim(),
          items: orderItems,
          total_amount: totalPrice,
          status: 'received',
        },
      ]);

      if (error) throw error;

      showNotification('สั่งซื้อเรียบร้อยแล้ว!', 'success');
      setCart({});
    } catch (error) {
      console.error('Error sending order:', error);
      showNotification(`สั่งไม่สำเร็จ: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121614] text-[#E0E6E2] flex items-center justify-center p-4">
        <div className="text-lg animate-pulse">กำลังโหลดเมนู...</div>
      </div>
    );
  }

  const filteredItems = selectedCategory
    ? menuItems.filter((i) => i.category_id === selectedCategory)
    : menuItems;

  return (
    <div className="min-h-screen bg-[#121614] text-[#E0E6E2] pb-32 font-sans">
      {notification && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-sm font-medium transition-all ${
            notification.type === 'error'
              ? 'bg-red-500/90 text-white'
              : 'bg-emerald-600/90 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      <header className="sticky top-0 z-10 bg-[#181D1A]/90 backdrop-blur-md border-b border-[#2A322D] px-5 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#F0F5F2] tracking-wide">Mellow Café</h1>
          <p className="text-xs text-[#8A9A90] mt-0.5">
            {tableNumber === 'counter' ? 'สั่งที่เคาน์เตอร์' : `โต๊ะที่ ${tableNumber}`}
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#2E3B33] text-[#A3E635] border border-[#3F5245]'
                  : 'bg-[#1C231F] text-[#8A9A90] hover:bg-[#252E29]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const qty = cart[item.id]?.quantity || 0;
            return (
              <div
                key={item.id}
                className="bg-[#1C231F] border border-[#2A322D] rounded-2xl p-4 flex justify-between items-center hover:border-[#38453D] transition-all"
              >
                <div className="flex-1 pr-3">
                  <h3 className="font-semibold text-sm text-[#E0E6E2]">{item.name}</h3>
                  <p className="text-[#A3E635] font-medium text-sm mt-1">
                    ฿{item.price || 0}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {qty > 0 ? (
                    <div className="flex items-center bg-[#252E29] rounded-xl p-1 border border-[#333F38]">
                      <button
                        onClick={() => updateQuantity(item, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1C231F] text-[#E0E6E2] font-bold text-sm hover:bg-[#2E3B33]"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-semibold text-[#A3E635]">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(item, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#2E3B33] text-[#A3E635] font-bold text-sm hover:bg-[#38453D]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateQuantity(item, 1)}
                      className="px-3 py-1.5 rounded-xl bg-[#252E29] hover:bg-[#2E3B33] text-[#A3E635] text-xs font-semibold border border-[#333F38] transition-all"
                    >
                      เพิ่ม
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#181D1A] border-t border-[#2A322D] p-4 shadow-2xl z-20">
        <div className="max-w-xl mx-auto space-y-3">
          <div>
            <input
              type="text"
              placeholder="ชื่อของคุณ (จำเป็น)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[#121614] border border-[#2A322D] focus:border-[#A3E635] rounded-xl px-4 py-2.5 text-sm text-[#E0E6E2] placeholder-[#5A6A60] outline-none transition-all"
            />
          </div>

          <button
            onClick={handleSendOrder}
            disabled={submitting || totalItemsCount === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              totalItemsCount > 0 && !submitting
                ? 'bg-[#A3E635] text-[#121614] hover:bg-[#B4F04D] shadow-lg shadow-[#A3E635]/10'
                : 'bg-[#252E29] text-[#5A6A60] cursor-not-allowed'
            }`}
          >
            {submitting ? (
              'กำลังส่งออเดอร์...'
            ) : (
              <>
                <span>สั่งเลย</span>
                {totalItemsCount > 0 && (
                  <span className="bg-[#121614]/20 px-2 py-0.5 rounded-md text-xs font-semibold">
                    ฿{totalPrice} ({totalItemsCount} ชิ้น)
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
