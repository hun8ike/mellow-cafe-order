"use client";
import { useEffect, useState, useCallback } from "react";
import { sb, baht } from "../../lib/supabase";

const NEXT = { pending: ["preparing", "เริ่มทำ"], preparing: ["done", "ทำเสร็จ"] };
const LABEL = { pending: "รอทำ", preparing: "กำลังทำ", done: "เสร็จแล้ว" };

export default function Staff() {
  const [sales, setSales] = useState({});
  const [low, setLow] = useState([]);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [s, l, o] = await Promise.all([
      sb.from("sales_summary").select("*").single(),
      sb.from("low_stock_ingredients").select("*"),
      sb.from("orders").select("*, order_items(quantity, menu_items(name))")
        .order("created_at", { ascending: false }).limit(30),
    ]);
    const e = s.error || l.error || o.error;
    setErr(e ? e.message : "");
    setSales(s.data || {}); setLow(l.data || []); setOrders(o.data || []);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  async function update(id, patch) {
    const { error } = await sb.from("orders").update(patch).eq("id", id);
    if (error) setErr(error.message); else load();
  }

  return (
    <>
      {err && <p className="alert">เกิดข้อผิดพลาด: {err}</p>}
      <div className="stats">
        <div><b>{sales.total_orders ?? 0}</b>ออเดอร์ที่จ่ายแล้ว</div>
        <div><b>{baht(sales.total_sales ?? 0)}</b>ยอดขายรวม</div>
      </div>
      <h2>วัตถุดิบใกล้หมด</h2>
      {low.length ? low.map((i) => (
        <div className="alert" key={i.id}>{i.name}: เหลือ {i.quantity} {i.unit} (ขั้นต่ำ {i.minimum_quantity}) · {i.supplier}</div>
      )) : <p>ตอนนี้วัตถุดิบยังพอทุกอย่าง</p>}
      <h2>ออเดอร์ล่าสุด</h2>
      {!orders.length && <p>ยังไม่มีออเดอร์</p>}
      {orders.map((r) => (
        <div className="order" key={r.id}>
          <div className="row" style={{ padding: 0 }}>
            <b>{r.order_number} {r.customer_name}</b>
            <span>
              <span className="tag">{LABEL[r.status] || r.status}</span>{" "}
              <span className={"tag" + (r.payment_status === "paid" ? " paid" : "")}>
                {r.payment_status === "paid" ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
              </span>
            </span>
          </div>
          <div>{r.order_items.map((x) => `${x.menu_items?.name} × ${x.quantity}`).join(", ")}</div>
          <div className="row">
            <span>{baht(r.total_amount)}</span>
            <span>
              {NEXT[r.status] && <button className="sm" onClick={() => update(r.id, { status: NEXT[r.status][0] })}>{NEXT[r.status][1]}</button>}{" "}
              {r.payment_status !== "paid" && <button className="sm" onClick={() => update(r.id, { payment_status: "paid" })}>รับเงินแล้ว</button>}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}
