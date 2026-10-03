/* Noor Bakery – data layer. Every read and write goes through SQL (AlaSQL). */
(function (root) {
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
const TODAY = dayOffset(0);
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;

function ean13(body12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += (+body12[i]) * (i % 2 ? 3 : 1);
  return body12 + ((10 - (s % 10)) % 10);
}

const SCHEMA = `CREATE TABLE suppliers (
  id INT, name TEXT, phone TEXT);

CREATE TABLE ingredients (
  id INT, name TEXT, name_ta TEXT, unit TEXT, qty REAL,
  reorder_level REAL, cost REAL, expiry TEXT, supplier TEXT);

CREATE TABLE products (
  id INT, name TEXT, name_ta TEXT, category TEXT, price REAL,
  gst_rate REAL, shelf_days INT, batch_yield INT,
  reorder_level INT, barcode TEXT);

CREATE TABLE recipes (
  product_id INT, ingredient_id INT, qty REAL);

CREATE TABLE batches (
  id INT, product_id INT, qty INT, made_on TEXT, best_before TEXT);

CREATE TABLE bills (
  id INT, bill_no TEXT, day TEXT, time TEXT, customer TEXT,
  phone TEXT, payment TEXT, amount REAL, tax REAL, staff TEXT);

CREATE TABLE sales (
  id INT, bill_id INT, day TEXT, time TEXT,
  product_id INT, qty INT, amount REAL);

CREATE TABLE movements (
  id INT, day TEXT, time TEXT, item TEXT, kind TEXT,
  delta REAL, unit TEXT, note TEXT);

CREATE TABLE purchase_orders (
  id INT, day TEXT, supplier TEXT, items TEXT, status TEXT);

CREATE TABLE cake_orders (
  id INT, customer TEXT, phone TEXT, item TEXT, weight_kg REAL,
  cake_text TEXT, due_day TEXT, due_time TEXT, amount REAL,
  advance REAL, status TEXT, created_day TEXT);`;

const TABLES = ['suppliers','ingredients','products','recipes','batches','bills','sales','movements','purchase_orders','cake_orders'];

let db;
const LOG = [];
let onLog = null;

function fmtSql(sql, params) {
  let i = 0;
  return sql.trim().replace(/\s+/g, ' ').replace(/\?/g, () => {
    const v = params[i++];
    return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v);
  });
}
function q(sql, params = [], log = false) {
  if (log) { LOG.unshift(fmtSql(sql, params)); if (LOG.length > 60) LOG.length = 60; if (onLog) onLog(); }
  return db.exec(sql, params);
}
const w = (sql, params) => q(sql, params, true);
function nextId(t) { const r = q(`SELECT MAX(id) AS m FROM ${t}`); return (r[0] && r[0].m ? r[0].m : 0) + 1; }
function createSchema() {
  db = new root.alasql.Database();
  SCHEMA.split(';').map(s => s.trim()).filter(Boolean).forEach(s => db.exec(s));
}

/* ---------------- seed ---------------- */
function seed() {
  createSchema();
  let rs = 20261003;
  const rnd = () => (rs = (rs * 1664525 + 1013904223) % 4294967296) / 4294967296;

  [[1,'Sri Lakshmi Traders','9840012345'],[2,'Annai Dairy','9840023456'],[3,'Kumar Poultry','9840034567'],[4,'Bake Supply Co.','9840045678']]
    .forEach(r => q('INSERT INTO suppliers VALUES (?,?,?)', r));

  [
    [1,'Maida (all-purpose flour)','மைதா','kg',42,20,38,dayOffset(60),'Sri Lakshmi Traders'],
    [2,'Sugar','சர்க்கரை','kg',18,10,44,dayOffset(180),'Sri Lakshmi Traders'],
    [3,'Butter','வெண்ணெய்','kg',2.5,5,520,dayOffset(12),'Annai Dairy'],
    [4,'Eggs','முட்டை','pcs',90,60,6.5,dayOffset(6),'Kumar Poultry'],
    [5,'Milk','பால்','L',6,8,56,dayOffset(2),'Annai Dairy'],
    [6,'Instant yeast','ஈஸ்ட்','kg',0.8,0.5,420,dayOffset(90),'Bake Supply Co.'],
    [7,'Cocoa powder','கோகோ பவுடர்','kg',1.2,1,650,dayOffset(120),'Bake Supply Co.'],
    [8,'Fresh cream','ஃப்ரெஷ் கிரீம்','L',3,2,240,dayOffset(3),'Annai Dairy'],
    [9,'Salt','உப்பு','kg',5,1,28,dayOffset(365),'Sri Lakshmi Traders'],
    [10,'Cooking oil','சமையல் எண்ணெய்','L',10,5,150,dayOffset(150),'Sri Lakshmi Traders'],
  ].forEach(r => q('INSERT INTO ingredients VALUES (?,?,?,?,?,?,?,?,?)', r));

  [
    [1,'Sandwich bread 400 g','சாண்ட்விச் பிரெட் 400 கி','Bread',45,0,3,12,10,ean13('890123400001')],
    [2,'Butter bun','பட்டர் பன்','Bread',15,5,2,50,20,ean13('890123400002')],
    [3,'Veg puff','வெஜ் பஃப்','Snacks',20,5,1,60,15,ean13('890123400003')],
    [4,'Chocolate pastry','சாக்லேட் பேஸ்ட்ரி','Cakes',60,5,2,16,8,ean13('890123400004')],
    [5,'Plum cake 500 g','பிளம் கேக் 500 கி','Cakes',180,5,10,8,4,ean13('890123400005')],
    [6,'Coconut biscuits 250 g','தேங்காய் பிஸ்கட் 250 கி','Biscuits',70,5,20,20,10,ean13('890123400006')],
  ].forEach(r => q('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)', r));

  const rec = {
    1: [[1,6],[2,0.3],[6,0.1],[9,0.1],[10,0.3],[5,1]],
    2: [[1,3],[2,0.6],[3,0.4],[6,0.06],[5,1.2],[4,4]],
    3: [[1,2.5],[3,0.8],[9,0.05],[10,0.3]],
    4: [[1,1],[2,1],[4,12],[7,0.3],[8,1.5],[10,0.4]],
    5: [[1,1.6],[2,1.2],[3,1],[4,16]],
    6: [[1,2],[2,1.2],[3,1],[9,0.02]],
  };
  Object.entries(rec).forEach(([p, list]) => list.forEach(([i, qt]) => q('INSERT INTO recipes VALUES (?,?,?)', [+p, i, qt])));

  [
    [1,1,4,dayOffset(-2),dayOffset(1)],
    [2,1,10,TODAY,dayOffset(3)],
    [3,2,4,dayOffset(-3),dayOffset(-1)],
    [4,2,26,TODAY,dayOffset(2)],
    [5,3,8,dayOffset(-1),TODAY],
    [6,4,10,TODAY,dayOffset(2)],
    [7,5,6,dayOffset(-2),dayOffset(8)],
    [8,6,22,dayOffset(-5),dayOffset(15)],
  ].forEach(r => q('INSERT INTO batches VALUES (?,?,?,?,?)', r));

  // Sales history: last 7 days + this morning
  const prods = q('SELECT * FROM products ORDER BY id');
  const base = {1:18, 2:40, 3:30, 4:12, 5:3, 6:8};
  const pays = () => { const x = rnd(); return x < 0.55 ? 'UPI' : x < 0.92 ? 'Cash' : 'Card'; };
  let billId = 0, saleId = 0;
  const addBill = (day, time, lines, payment, staff) => {
    billId++;
    let amt = 0, tax = 0;
    lines.forEach(([pid, n]) => {
      const p = prods[pid - 1]; const a = n * p.price;
      amt += a; tax += a * p.gst_rate / (100 + p.gst_rate);
      q('INSERT INTO sales VALUES (?,?,?,?,?,?,?)', [++saleId, billId, day, time, pid, n, a]);
    });
    q('INSERT INTO bills VALUES (?,?,?,?,?,?,?,?,?,?)', [billId, 'NB-' + String(billId).padStart(4, '0'), day, time, '', '', payment, amt, r2(tax), staff]);
  };
  for (let d = -7; d <= -1; d++) {
    const day = dayOffset(d);
    const wd = new Date(day + 'T00:00:00').getDay();
    const factor = (wd === 0 || wd === 6) ? 1.3 : 1;
    const lines = [];
    prods.forEach(p => {
      let n = Math.round(base[p.id] * factor * (0.75 + 0.5 * rnd()));
      while (n > 0) { const take = Math.min(n, 1 + Math.floor(rnd() * 4)); lines.push([p.id, take]); n -= take; }
    });
    for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; }
    let minute = 7 * 60;
    for (let i = 0; i < lines.length;) {
      const k = rnd() < 0.35 ? 2 : 1;
      const group = [];
      lines.slice(i, i + k).forEach(l => { const ex = group.find(g => g[0] === l[0]); ex ? ex[1] += l[1] : group.push([...l]); });
      i += k;
      minute = Math.min(21 * 60 + 30, minute + 8 + Math.floor(rnd() * 14));
      addBill(day, `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`, group, pays(), rnd() < 0.6 ? 'Staff' : 'Owner');
    }
  }
  [['07:52',[[1,2],[2,4]],'UPI'],['08:12',[[1,4]],'Cash'],['08:40',[[2,8],[3,2]],'UPI'],['09:05',[[3,5]],'Cash'],['10:22',[[4,4]],'UPI'],['11:47',[[6,3]],'Card']]
    .forEach(([t, lines, pay]) => addBill(TODAY, t, lines, pay, 'Staff'));

  // Stock movements (recent)
  const mv = [
    [dayOffset(-6),'21:30','Veg puff','waste',-6,'pcs','Expired, removed from counter'],
    [dayOffset(-5),'21:30','Butter bun','waste',-5,'pcs','Expired, removed from counter'],
    [dayOffset(-4),'21:30','Veg puff','waste',-4,'pcs','Expired, removed from counter'],
    [dayOffset(-3),'21:30','Chocolate pastry','waste',-3,'pcs','Expired, removed from counter'],
    [dayOffset(-2),'21:30','Veg puff','waste',-7,'pcs','Expired, removed from counter'],
    [dayOffset(-1),'17:30','Maida (all-purpose flour)','in',50,'kg','Received from Sri Lakshmi Traders'],
    [dayOffset(-1),'21:30','Sandwich bread 400 g','waste',-2,'pcs','Expired, removed from counter'],
    [TODAY,'05:10','Sandwich bread 400 g','bake',10,'pcs','Baked fresh batch'],
    [TODAY,'05:40','Butter bun','bake',26,'pcs','Baked fresh batch'],
    [TODAY,'06:15','Chocolate pastry','bake',10,'pcs','Baked fresh batch'],
  ];
  mv.forEach((r, i) => q('INSERT INTO movements VALUES (?,?,?,?,?,?,?,?)', [i + 1, ...r]));
  q(`SELECT s.time, p.name, s.qty FROM sales s JOIN products p ON s.product_id = p.id WHERE s.day = ? ORDER BY s.id`, [TODAY]).forEach(r =>
    q('INSERT INTO movements VALUES (?,?,?,?,?,?,?,?)', [nextId('movements'), TODAY, r.time, r.name, 'sale', -r.qty, 'pcs', 'Counter sale']));

  [
    [1,'Priya S.','9876500011','Chocolate truffle cake',1,'Happy Birthday Anu',TODAY,'18:00',950,400,'pending',dayOffset(-2)],
    [2,'Rahul K.','9876500022','Black forest cake',2,'Happy Anniversary',dayOffset(1),'11:00',1600,500,'pending',dayOffset(-1)],
    [3,'Fathima B.','9876500033','Eggless vanilla cake',1.5,'Congrats Imran',dayOffset(3),'16:30',1200,0,'pending',TODAY],
  ].forEach(r => q('INSERT INTO cake_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', r));
}

function move(item, kind, delta, unit, note) {
  w('INSERT INTO movements VALUES (?,?,?,?,?,?,?,?)', [nextId('movements'), TODAY, nowTime(), item, kind, r3(delta), unit, note]);
}

/* ---------------- stock ---------------- */
function receive(id, qty, expiry, note) {
  const ing = q('SELECT * FROM ingredients WHERE id = ?', [id])[0];
  w('UPDATE ingredients SET qty = ROUND(qty + ?, 3), expiry = ? WHERE id = ?', [qty, expiry, id]);
  move(ing.name, 'in', qty, ing.unit, note || 'Received from ' + ing.supplier);
  return ing;
}
function addIngredient(d) {
  const id = nextId('ingredients');
  w('INSERT INTO ingredients VALUES (?,?,?,?,?,?,?,?,?)', [id, d.name, '', d.unit, d.qty, d.reorder, d.cost, d.expiry, d.supplier || 'Sri Lakshmi Traders']);
  move(d.name, 'in', d.qty, d.unit, 'Opening stock');
}
function recipeNeeds(pid, n) {
  return q(`SELECT r.ingredient_id, i.name, i.name_ta, i.unit, r.qty * ? AS need, i.qty AS have
            FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id
            WHERE r.product_id = ?`, [n, pid]);
}
function bake(pid, n) {
  const p = q('SELECT * FROM products WHERE id = ?', [pid])[0];
  const needs = recipeNeeds(pid, n);
  const short = needs.filter(x => x.need > x.have + 1e-9);
  if (short.length) return { ok: false, short };
  q(`SELECT r.ingredient_id, i.name, r.qty * ? AS need, i.qty AS have FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id WHERE r.product_id = ?`, [n, pid], true);
  needs.forEach(x => w('UPDATE ingredients SET qty = ROUND(qty - ?, 3) WHERE id = ?', [r3(x.need), x.ingredient_id]));
  const made = p.batch_yield * n;
  w('INSERT INTO batches VALUES (?,?,?,?,?)', [nextId('batches'), pid, made, TODAY, dayOffset(p.shelf_days)]);
  move(p.name, 'bake', made, 'pcs', `Baked ${n} batch${n > 1 ? 'es' : ''}`);
  return { ok: true, made, product: p };
}
function freshStock(pid) {
  return q('SELECT SUM(qty) AS s FROM batches WHERE product_id = ? AND best_before >= ?', [pid, TODAY])[0].s || 0;
}
function writeOff() {
  const exp = q(`SELECT b.id, b.qty, p.name, p.price FROM batches b JOIN products p ON b.product_id = p.id WHERE b.best_before < ?`, [TODAY], true);
  if (!exp.length) return { count: 0, loss: 0 };
  w('DELETE FROM batches WHERE best_before < ?', [TODAY]);
  let loss = 0, count = 0;
  exp.forEach(e => { loss += e.qty * e.price; count += e.qty; move(e.name, 'waste', -e.qty, 'pcs', 'Expired, removed from counter'); });
  return { count, loss };
}

/* ---------------- billing ---------------- */
function checkout(cart, info) {
  const lines = cart.filter(l => l.qty > 0);
  if (!lines.length) return { ok: false, error: 'empty' };
  for (const l of lines) {
    const have = freshStock(l.pid);
    if (l.qty > have) {
      const p = q('SELECT name FROM products WHERE id = ?', [l.pid])[0];
      return { ok: false, error: 'stock', name: p.name, have };
    }
  }
  const billId = nextId('bills');
  const billNo = 'NB-' + String(billId).padStart(4, '0');
  const time = nowTime();
  let amount = 0, tax = 0;
  const items = [];
  for (const l of lines) {
    const p = q('SELECT * FROM products WHERE id = ?', [l.pid])[0];
    const list = q('SELECT * FROM batches WHERE product_id = ? AND best_before >= ? AND qty > 0 ORDER BY best_before, made_on', [l.pid, TODAY], true);
    let left = l.qty;
    for (const b of list) {
      if (!left) break;
      const take = Math.min(left, b.qty);
      if (take === b.qty) w('DELETE FROM batches WHERE id = ?', [b.id]);
      else w('UPDATE batches SET qty = qty - ? WHERE id = ?', [take, b.id]);
      left -= take;
    }
    const a = l.qty * p.price;
    const tx = a * p.gst_rate / (100 + p.gst_rate);
    amount += a; tax += tx;
    w('INSERT INTO sales VALUES (?,?,?,?,?,?,?)', [nextId('sales'), billId, TODAY, time, p.id, l.qty, a]);
    move(p.name, 'sale', -l.qty, 'pcs', 'Bill ' + billNo);
    items.push({ pid: p.id, name: p.name, name_ta: p.name_ta, qty: l.qty, price: p.price, amount: a, gst_rate: p.gst_rate, tax: tx });
  }
  w('INSERT INTO bills VALUES (?,?,?,?,?,?,?,?,?,?)', [billId, billNo, TODAY, time, info.customer || '', info.phone || '', info.payment || 'Cash', amount, r2(tax), info.staff || 'Owner']);
  return { ok: true, bill: { id: billId, bill_no: billNo, day: TODAY, time, customer: info.customer || '', phone: info.phone || '', payment: info.payment || 'Cash', amount, tax: r2(tax), items } };
}
function productByBarcode(code) {
  return q('SELECT * FROM products WHERE barcode = ?', [String(code).trim()])[0] || null;
}

/* ---------------- purchase orders ---------------- */
function suggestQty(i) {
  let need = i.reorder_level * 2 - i.qty;
  if (i.unit === 'pcs') return Math.max(30, Math.ceil(need / 30) * 30);
  return Math.max(1, Math.ceil(need));
}
function reorderPlan() {
  const low = q(`SELECT i.id, i.name, i.unit, i.qty, i.reorder_level, i.cost, i.supplier, s.phone
                 FROM ingredients i JOIN suppliers s ON i.supplier = s.name
                 WHERE i.qty <= i.reorder_level ORDER BY i.supplier, i.name`);
  const by = {};
  low.forEach(i => {
    (by[i.supplier] = by[i.supplier] || { supplier: i.supplier, phone: i.phone, items: [] })
      .items.push({ id: i.id, name: i.name, unit: i.unit, qty: suggestQty(i), cost: i.cost });
  });
  return Object.values(by);
}
function createPO(plan) {
  const id = nextId('purchase_orders');
  w('INSERT INTO purchase_orders VALUES (?,?,?,?,?)', [id, TODAY, plan.supplier, JSON.stringify(plan.items), 'sent']);
  return id;
}
function receivePO(id) {
  const po = q('SELECT * FROM purchase_orders WHERE id = ?', [id])[0];
  if (!po || po.status !== 'sent') return null;
  JSON.parse(po.items).forEach(it => {
    const ing = q('SELECT * FROM ingredients WHERE id = ?', [it.id])[0];
    const keep = ing.expiry > TODAY ? ing.expiry : dayOffset(30);
    receive(it.id, it.qty, keep, `Purchase order #${id} from ${po.supplier}`);
  });
  w('UPDATE purchase_orders SET status = ? WHERE id = ?', ['received', id]);
  return po;
}
function pendingPOs() { return q("SELECT * FROM purchase_orders WHERE status = 'sent' ORDER BY id DESC"); }
function sentToday(supplier) {
  return q("SELECT COUNT(*) AS c FROM purchase_orders WHERE status = 'sent' AND supplier = ?", [supplier])[0].c > 0;
}

/* ---------------- cake orders ---------------- */
function addCakeOrder(d) {
  const id = nextId('cake_orders');
  w('INSERT INTO cake_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, d.customer, d.phone, d.item, d.weight, d.text, d.due_day, d.due_time, d.amount, d.advance, 'pending', TODAY]);
  return id;
}
function setCakeStatus(id, status) { w('UPDATE cake_orders SET status = ? WHERE id = ?', [status, id]); }
function cakeOrders() { return q("SELECT * FROM cake_orders WHERE status <> 'delivered' ORDER BY due_day, due_time"); }
function deliveredCakes() { return q("SELECT * FROM cake_orders WHERE status = 'delivered' ORDER BY due_day DESC"); }

/* ---------------- reports ---------------- */
function closing(day) {
  const s = q('SELECT SUM(amount) AS amt, SUM(tax) AS tax, COUNT(*) AS bills FROM bills WHERE day = ?', [day])[0];
  const items = q('SELECT SUM(qty) AS n FROM sales WHERE day = ?', [day])[0].n || 0;
  const byPay = q('SELECT payment, COUNT(*) AS bills, SUM(amount) AS amt FROM bills WHERE day = ? GROUP BY payment ORDER BY amt DESC', [day]);
  const top = q(`SELECT p.name, p.name_ta, SUM(s.qty) AS sold, SUM(s.amount) AS revenue FROM sales s JOIN products p ON s.product_id = p.id
                 WHERE s.day = ? GROUP BY p.name, p.name_ta ORDER BY revenue DESC`, [day]);
  const waste = q(`SELECT m.item, -SUM(m.delta) AS pcs, -SUM(m.delta * p.price) AS loss FROM movements m JOIN products p ON m.item = p.name
                   WHERE m.kind = 'waste' AND m.day = ? GROUP BY m.item`, [day]);
  const advance = q("SELECT SUM(advance) AS a FROM cake_orders WHERE created_day = ?", [day])[0].a || 0;
  return { amount: s.amt || 0, tax: s.tax || 0, bills: s.bills || 0, items, byPay, top, waste,
           wasteValue: waste.reduce((a, b) => a + b.loss, 0), advance };
}
function weekly() {
  const from = dayOffset(-6);
  const rows = q('SELECT day, SUM(amount) AS amt, COUNT(*) AS bills FROM bills WHERE day >= ? GROUP BY day', [from]);
  const out = [];
  for (let d = -6; d <= 0; d++) {
    const day = dayOffset(d); const r = rows.find(x => x.day === day);
    out.push({ day, amount: r ? r.amt : 0, bills: r ? r.bills : 0 });
  }
  return out;
}
function profit() {
  return q(`SELECT p.id, p.name, p.name_ta, p.price, p.gst_rate, p.batch_yield, SUM(r.qty * i.cost) AS batch_cost
            FROM recipes r JOIN ingredients i ON r.ingredient_id = i.id JOIN products p ON r.product_id = p.id
            GROUP BY p.id, p.name, p.name_ta, p.price, p.gst_rate, p.batch_yield ORDER BY p.id`).map(r => {
    const net = r.price * 100 / (100 + r.gst_rate);
    const unit = r.batch_cost / r.batch_yield;
    return { ...r, net, unit, margin: net - unit, pct: (net - unit) / net * 100 };
  });
}
function wasteReport(days) {
  const from = dayOffset(-days);
  const waste = q(`SELECT m.item, -SUM(m.delta) AS pcs, -SUM(m.delta * p.price) AS loss FROM movements m JOIN products p ON m.item = p.name
                   WHERE m.kind = 'waste' AND m.day >= ? GROUP BY m.item`, [from]);
  const sold = q(`SELECT p.name, SUM(s.qty) AS sold FROM sales s JOIN products p ON s.product_id = p.id WHERE s.day >= ? GROUP BY p.name`, [from]);
  return waste.map(w0 => {
    const s = (sold.find(x => x.name === w0.item) || {}).sold || 0;
    return { ...w0, sold: s, rate: w0.pcs / (s + w0.pcs) * 100 };
  }).sort((a, b) => b.loss - a.loss);
}
function bakeTomorrow() {
  const from = dayOffset(-7);
  const prods = q('SELECT * FROM products ORDER BY id');
  const sold = q('SELECT product_id, SUM(qty) AS n FROM sales WHERE day >= ? AND day < ? GROUP BY product_id', [from, TODAY]);
  return prods.map(p => {
    const avg = ((sold.find(s => s.product_id === p.id) || {}).n || 0) / 7;
    const carry = q('SELECT SUM(qty) AS s FROM batches WHERE product_id = ? AND best_before > ?', [p.id, TODAY])[0].s || 0;
    const need = Math.max(0, Math.ceil(avg) - carry);
    return { id: p.id, name: p.name, name_ta: p.name_ta, avg, carry, need, batches: need ? Math.ceil(need / p.batch_yield) : 0, yield: p.batch_yield };
  });
}

/* ---------------- save / load ---------------- */
function dump() { const data = {}; TABLES.forEach(t => data[t] = db.exec(`SELECT * FROM ${t}`)); return data; }
function restore(data) {
  createSchema();
  TABLES.forEach(t => { if (data[t] && data[t].length) db.exec(`INSERT INTO ${t} SELECT * FROM ?`, [data[t]]); });
}

root.Core = {
  SCHEMA, TABLES, LOG, TODAY, dayOffset, nowTime, r2, r3,
  get db() { return db; }, set onLog(f) { onLog = f; },
  q, w, seed, dump, restore,
  receive, addIngredient, recipeNeeds, bake, freshStock, writeOff,
  checkout, productByBarcode,
  reorderPlan, createPO, receivePO, pendingPOs, sentToday,
  addCakeOrder, setCakeStatus, cakeOrders, deliveredCakes,
  closing, weekly, profit, wasteReport, bakeTomorrow,
};
})(typeof window !== 'undefined' ? window : globalThis);
