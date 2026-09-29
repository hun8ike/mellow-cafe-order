'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [existingSession, setExistingSession] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [currentOrderUrl, setCurrentOrderUrl] = useState('');
  const [createdTable, setCreatedTable] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const calculateMinutes = (createdAt) => {
    if (!createdAt) return 0;
    const diffMs = new Date() - new Date(createdAt);
    return Math.floor(diffMs / (1000 * 60));
  };

  const handleOpenTable = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExistingSession(null);

    if (!tableNumber || isNaN(tableNumber) || parseInt(tableNumber) <= 0) {
      setErrorMsg('กรุณากรอกหมายเลขโต๊ะให้ถูกต้อง');
      return;
    }

    const tableNum = parseInt(tableNumber, 10);
    setLoading(true);

    try {
      const { data: existing, error: checkError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', tableNum)
        .eq('status', 'open')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        setExistingSession(existing);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('sessions').insert([
        {
          table_number: tableNum,
          adult_count: 0,
          child_count: 0,
          status: 'open',
        },
      ]);

      if (insertError) throw insertError;

      const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : '');
      const targetUrl = `${baseUrl}/order/${tableNum}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        targetUrl
      )}`;

      setQrUrl(qrApiUrl);
      setCurrentOrderUrl(targetUrl);
      setCreatedTable(tableNum);
    } catch (err) {
      console.error('Error opening table:', err);
      setErrorMsg(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseExistingSession = async () => {
    if (!existingSession) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', existingSession.id)
        .eq('status', 'open');

      if (error) throw error;

      setShowConfirmModal(false);
      setExistingSession(null);
    } catch (err) {
      console.error('Error closing session:', err);
      alert(`ปิดโต๊ะไม่สำเร็จ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (currentOrderUrl) {
      navigator.clipboard.writeText(currentOrderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setTableNumber('');
    setQrUrl('');
    setCurrentOrderUrl('');
    setCreatedTable('');
    setExistingSession(null);
    setShowConfirmModal(false);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#121614] text-[#E0E6E2] p-4 sm:p-6 font-sans flex items-center justify-center">
      <div className="w-full max-w-md bg-[#181D1A] border border-[#2A322D] rounded-3xl p-6 shadow-2xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#F0F5F2] tracking-wide">Mellow Café</h1>
          <p className="text-sm text-[#8A9A90] mt-1">ระบบเปิดโต๊ะ & สร้าง QR Code</p>
        </header>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {existingSession && (
          <div className="mb-6 p-5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl text-amber-200">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              ⚠️ โต๊ะนี้มีลูกค้าอยู่
            </h2>
            <p className="text-sm mt-1 text-amber-200/80">
              โต๊ะ {existingSession.table_number} ยังไม่ได้ปิดออเดอร์เดิม กรุณาปิดออเดอร์เดิมก่อนเปิดโต๊ะใหม่
            </p>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-400 text-[#121614] font-bold rounded-xl transition-all shadow-md"
            >
              ปิดออเดอร์เดิม
            </button>
          </div>
        )}

        {qrUrl ? (
          <div className="text-center space-y-5">
            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg">
              <img
                src={qrUrl}
                alt={`QR Code โต๊ะ ${createdTable}`}
                className="w-64 h-64 mx-auto block"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#A3E635]">โต๊ะ {createdTable}</h2>
              <p className="text-xs text-[#8A9A90] mt-1 break-all px-4 font-mono">
                {currentOrderUrl}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 bg-[#252E29] hover:bg-[#2E3B33] text-[#A3E635] border border-[#333F38] font-semibold text-sm rounded-xl transition-all"
              >
                {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 bg-[#A3E635] hover:bg-[#B4F04D] text-[#121614] font-bold text-sm rounded-xl transition-all"
              >
                เปิดโต๊ะใหม่
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleOpenTable} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#8A9A90] mb-2">
                หมายเลขโต๊ะ (ตัวเลข)
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="เช่น 1, 2, 3"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full bg-[#121614] border border-[#2A322D] focus:border-[#A3E635] text-center text-2xl font-bold rounded-2xl p-4 text-[#E0E6E2] outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!existingSession}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                loading || !!existingSession
                  ? 'bg-[#252E29] text-[#5A6A60] cursor-not-allowed'
                  : 'bg-[#A3E635] hover:bg-[#B4F04D] text-[#121614] shadow-lg shadow-[#A3E635]/10'
              }`}
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เปิดโต๊ะ'}
            </button>
          </form>
        )}
      </div>

      {showConfirmModal && existingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181D1A] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-red-400">ยืนยันปิดออเดอร์เดิม?</h3>

            <div className="bg-[#121614] p-4 rounded-2xl space-y-2 border border-[#2A322D] text-sm">
              <p className="text-base font-semibold text-[#E0E6E2]">
                โต๊ะ: <span className="text-[#A3E635]">{existingSession.table_number}</span>
              </p>
              <p className="text-[#8A9A90]">
                เปิดมาแล้ว:{' '}
                <span className="text-amber-400 font-medium">
                  {calculateMinutes(existingSession.created_at)} นาที
                </span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-[#252E29] hover:bg-[#2E3B33] text-[#E0E6E2] font-semibold text-sm rounded-xl transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCloseExistingSession}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-all shadow-md"
              >
                {loading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
