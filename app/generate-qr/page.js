"use client";
import { useState } from "react";
import { sb } from "../../lib/supabase";

const box = { border: "1px solid var(--line)", borderRadius: 16, padding: 20, background: "var(--card)" };
const bigBtn = { fontSize: 22, fontWeight: 700, padding: "14px 20px", borderRadius: 12, border: 0, cursor: "pointer" };

export default function GenerateQR() {
  const [table, setTable] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [existing, setExisting] = useState(null); // session เก่าที่ค้างอยู่
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null); // { table, url }
  const [copied, setCopied] = useState(false);

  const tableNo = Number(table);
  const valid = Number.isInteger(tableNo) && tableNo > 0;
  const minutesOpen = (s) => Math.max(0, Math.floor((Date.now() - new Date(s.created_at).getTime()) / 60000));

  async function openTable() {
    if (!valid) { setErr("กรุณากรอกเลขโต๊ะเป็นตัวเลข"); return; }
    setBusy(true); setErr(""); setExisting(null);
    try {
      const { data: open, error } = await sb.from("sessions")
        .select("id, table_number, adult_count, child_count, created_at")
        .eq("table_number", tableNo).eq("status", "open")
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      if (open && open.length) { setExisting(open[0]); return; }

      const { error: e2 } = await sb.from("sessions")
        .insert({ table_number: tableNo, adult_count: 0, child_count: 0, status: "open" });
      if (e2) throw e2;
      setResult({ table: tableNo, url: `${window.location.origin}/order/${tableNo}` });
      setCopied(false);
    } catch (e) { setErr("เปิดโต๊ะไม่สำเร็จ: " + e.message); }
    finally { setBusy(false); }
  }

  async function closeOld() {
    setBusy(true); setErr("");
    try {
      const { error } = await sb.from("sessions").update({ status: "closed" })
        .eq("id", existing.id).eq("status", "open");
      if (error) throw error;
      setConfirming(false); setExisting(null); // กลับไปฟอร์มเดิม ค่าที่กรอกยังอยู่
    } catch (e) { setErr("ปิดโต๊ะเดิมไม่สำเร็จ: " + e.message); setConfirming(false); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setErr("คัดลอกไม่ได้ กรุณาคัดลอกลิงก์ด้วยมือ"); }
  }

  function reset() { setResult(null); setTable(""); setErr(""); setExisting(null); }

  if (result) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.url)}`;
    return (
      <div style={{ ...box, textAlign: "center" }}>
        <img src={qr} alt={`QR Code โต๊ะ ${result.table}`} width={300} height={300} style={{ maxWidth: "100%", background: "#fff", padding: 8, borderRadius: 12 }} />
        <h2 style={{ fontSize: 36, margin: "16px 0 8px" }}>โต๊ะ {result.table}</h2>
        <p style={{ fontSize: 18, wordBreak: "break-all", margin: "0 0 12px" }}>
          {result.url}{" "}
          <button className="sm" onClick={copy}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button>
        </p>
        {err && <p className="alert" role="alert">{err}</p>}
        <button className="pri" style={bigBtn} onClick={reset}>เปิดโต๊ะใหม่</button>
      </div>
    );
  }

  return (
    <div style={{ ...box }}>
      <h2 style={{ fontSize: 28, margin: "0 0 12px" }}>เปิดโต๊ะ</h2>
      <label htmlFor="tbl" style={{ fontSize: 20, display: "block", marginBottom: 6 }}>เลขโต๊ะ</label>
      <input id="tbl" type="number" inputMode="numeric" min="1" value={table}
        onChange={(e) => { setTable(e.target.value); setExisting(null); setErr(""); }}
        onKeyDown={(e) => e.key === "Enter" && !busy && openTable()}
        style={{ fontSize: 28, width: "100%", padding: 12 }} />
      {err && <p className="alert" role="alert" style={{ fontSize: 18 }}>{err}</p>}

      {existing && (
        <div role="alert" style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "3px solid #c2410c", background: "#fff1e6", color: "#7c2d12" }}>
          <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>โต๊ะนี้มีลูกค้าอยู่ กรุณาปิดออเดอร์เดิมก่อน</p>
          <button style={{ ...bigBtn, background: "#c2410c", color: "#fff" }} onClick={() => setConfirming(true)}>ปิดออเดอร์เดิม</button>
        </div>
      )}

      <button className="pri" style={{ ...bigBtn, width: "100%", marginTop: 16 }} disabled={busy || !table} onClick={openTable}>
        {busy ? "กำลังทำงาน..." : "เปิดโต๊ะ"}
      </button>

      {confirming && existing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 20 }}>
          <div role="dialog" aria-modal="true" style={{ background: "#fff", color: "#1f2937", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", border: "4px solid #dc2626" }}>
            <h3 style={{ fontSize: 26, margin: "0 0 8px" }}>ปิดโต๊ะ {existing.table_number}?</h3>
            <p style={{ fontSize: 20, margin: "0 0 20px" }}>เปิดมาแล้ว {minutesOpen(existing)} นาที</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...bigBtn, flex: 1, background: "#e5e7eb", color: "#111" }} disabled={busy} onClick={() => setConfirming(false)}>ยกเลิก</button>
              <button style={{ ...bigBtn, flex: 1, background: "#dc2626", color: "#fff" }} disabled={busy} onClick={closeOld}>ยืนยันปิดโต๊ะเดิม</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
