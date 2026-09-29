"use client";
import { useEffect, useState } from "react";
import { sb, baht } from "../lib/supabase";

export default function Home() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.from("available_menu").select("*").order("id").then(({ data, error }) => {
      if (error) setMsg("โหลดเมนูไม่ได้: " + error.message);
      else setItems(data);
    });
  }, []);

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3000); };
  const change = (id, d) => setCart((c) => {
    const n = { ...c, [id]: (c[id] || 0) + d };
    if (n[id] <= 0) delete n[id];
    return n;
  });

  const lines = Object.keys(cart).map((id) => {
    const it = items.find((i) => i.id == id);
    return { menu_item_id: it.id, name: it.name, quantity: cart[id], price: it.price, subtotal: it.price * cart[id] };
  });
  const total = lines.reduce((s, l) => s + l.subtotal, 0);
  const cats = [...new Set(items.map((i) => i.category))];

  async function order() {
    setBusy(true);
    try {
      const num = "M" + Date.now().toString().slice(-8);
      const { data: o, error } = await sb.from("orders")
        .insert({ order_number: num, customer_name: name.trim() || null, total_amount: total })
        .select().single();
      if (error) throw error;
      const { error: e2 } = await sb.from("order_items").insert(
        lines.map(({ name, ...l }) => ({ ...l, order_id: o.id }))
      );
      if (e2) throw e2;
      setCart({}); setName("");
      toast(`สั่งสำเร็จ เลขออเดอร์ ${num}`);
    } catch (e) { toast("สั่งไม่สำเร็จ: " + e.message); }
    setBusy(false);
  }

  return (
    <>
      {msg && <div className="toast" role="status">{msg}</div>}
      {!items.length && !msg && <p>กำลังโหลดเมนู...</p>}
      {cats.map((c) => (
        <section key={c}>
          <h2>{c}</h2>
          <div className="grid">
            {items.filter((i) => i.category === c).map((i) => (
              <div className="item" key={i.id}>
                <b>{i.name}</b>
                <small>{i.description}</small>
                <div className="row">
                  <span>{baht(i.price)}</span>
                  <button className="sm" onClick={() => change(i.id, 1)}>เพิ่ม</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {lines.length > 0 && (
        <div className="cart"><div className="in">
          <ul>
            {lines.map((l) => (
              <li key={l.menu_item_id}>
                <span>{l.name} × {l.quantity}</span>
                <span>
                  <button className="sm" onClick={() => change(l.menu_item_id, -1)}>−</button>{" "}
                  <button className="sm" onClick={() => change(l.menu_item_id, 1)}>+</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="row" style={{ paddingTop: 0 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อลูกค้า" aria-label="ชื่อลูกค้า" />
            <button className="pri" disabled={busy} onClick={order}>สั่งเลย {baht(total)}</button>
          </div>
        </div></div>
      )}
    </>
  );
}
