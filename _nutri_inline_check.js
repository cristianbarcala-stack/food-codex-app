const LS_PROFILE = "app_profile_v3";
    const LS_LOG = "app_log_v3";
    const LS_DB = "app_db_v3";
    const LS_ACT = "app_activities_v3";
    const LS_LANG = "app_ui_lang_v1";
    const LS_FAV = "app_fav_foods_v1";
    const LS_ARCHIVE = "app_day_archive_v1";

    let DB = [];
    let perfil = JSON.parse(localStorage.getItem(LS_PROFILE) || '{"peso":80,"altura":175,"edad":30,"sexo":"m","fase":"hipertrofia"}');
    let log = JSON.parse(localStorage.getItem(LS_LOG) || "[]");
    let activityData = normalizeStoredActivities(localStorage.getItem(LS_ACT));
    let activities = activityData.events;
    let dayBio = activityData.biometricos;
    let uiLang = localStorage.getItem(LS_LANG) || "es";
    let nutrientFilterKey = "";
    let showOnlyFavs = false;
    let favIds = JSON.parse(localStorage.getItem(LS_FAV) || "[]");

    const AMINO_COEF = { leu:80, lys:70, met:25, val:50, iso:45, phe:45, thr:40, trp:12, his:25 };
    const DEF_TARGETS = {
      p:1.8, c:3.0, g:0.9, f:30, fe:18, mg:420, zn:11, pot:4700, na:2300, vitc:90,
      creat:3000, ca:1000, phos:700, sel:55, cu:0.9, mn:2.3, iod:150,
      vita:900, vitd:15, vite:15, vitk:120, b1:1.2, b2:1.3, b3:16, b6:1.7, b12:2.4, fol:400
    };
    const NUTRIENT_DEFS = [
      { key:"kcal", es:"kcal", en:"calories", aliases:["calorias","calorias activas","energia","energy"] },
      { key:"p", es:"proteina", en:"protein", aliases:["proteinas","protein"] },
      { key:"c", es:"carbohidratos", en:"carbohydrates", aliases:["carbos","hidratos","carbohydrates","carbs"] },
      { key:"g", es:"grasas", en:"fats", aliases:["grasa","fat","fats","lipidos"] },
      { key:"f", es:"fibra", en:"fiber", aliases:["fiber","fibre"] },
      { key:"fe", es:"hierro", en:"iron", aliases:["iron","fierro"] },
      { key:"mg", es:"magnesio", en:"magnesium", aliases:["magnesium"] },
      { key:"zn", es:"zinc", en:"zinc", aliases:["zinc"] },
      { key:"pot", es:"potasio", en:"potassium", aliases:["potassium","k"] },
      { key:"na", es:"sodio", en:"sodium", aliases:["sodium","sal"] },
      { key:"vitc", es:"vitamina c", en:"vitamin c", aliases:["vit c","ascorbico","ascorbic"] },
      { key:"creat", es:"creatina", en:"creatine", aliases:["creatine"] },
      { key:"ca", es:"calcio", en:"calcium", aliases:["calcium"] },
      { key:"phos", es:"fosforo", en:"phosphorus", aliases:["phosphorus","phos"] },
      { key:"sel", es:"selenio", en:"selenium", aliases:["selenium"] },
      { key:"cu", es:"cobre", en:"copper", aliases:["copper"] },
      { key:"mn", es:"manganeso", en:"manganese", aliases:["manganese"] },
      { key:"iod", es:"yodo", en:"iodine", aliases:["iodine","iodo"] },
      { key:"vita", es:"vitamina a", en:"vitamin a", aliases:["retinol"] },
      { key:"vitd", es:"vitamina d", en:"vitamin d", aliases:["vit d"] },
      { key:"vite", es:"vitamina e", en:"vitamin e", aliases:["vit e"] },
      { key:"vitk", es:"vitamina k", en:"vitamin k", aliases:["vit k"] },
      { key:"b1", es:"vitamina b1", en:"vitamin b1", aliases:["tiamina","thiamine"] },
      { key:"b2", es:"vitamina b2", en:"vitamin b2", aliases:["riboflavina","riboflavin"] },
      { key:"b3", es:"vitamina b3", en:"vitamin b3", aliases:["niacina","niacin"] },
      { key:"b6", es:"vitamina b6", en:"vitamin b6", aliases:["pyridoxine"] },
      { key:"b12", es:"vitamina b12", en:"vitamin b12", aliases:["cobalamina","cobalamin"] },
      { key:"fol", es:"folato", en:"folate", aliases:["folic acid","acido folico"] },
      { key:"leu", es:"leucina", en:"leucine", aliases:["leucine"] },
      { key:"lys", es:"lisina", en:"lysine", aliases:["lysine"] },
      { key:"met", es:"metionina", en:"methionine", aliases:["methionine"] },
      { key:"val", es:"valina", en:"valine", aliases:["valine"] },
      { key:"iso", es:"isoleucina", en:"isoleucine", aliases:["isoleucine"] },
      { key:"phe", es:"fenilalanina", en:"phenylalanine", aliases:["phenylalanine"] },
      { key:"thr", es:"treonina", en:"threonine", aliases:["threonine"] },
      { key:"trp", es:"triptofano", en:"tryptophan", aliases:["tryptophan"] },
      { key:"his", es:"histidina", en:"histidine", aliases:["histidine"] }
    ];

    const $ = (id) => document.getElementById(id);
    const buscar = $("buscar"), foodSel = $("food"), modoSel = $("modo"), cantidad = $("cantidad");

    function setStatus(id,msg){ $(id).textContent = msg; }
    function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
    function fmt(v){ return Math.abs(v)>=100 ? v.toFixed(0) : Math.abs(v)>=10 ? v.toFixed(1) : v.toFixed(2); }
    function todayStr(){
      const d = new Date();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const day = String(d.getDate()).padStart(2,"0");
      return `${d.getFullYear()}-${m}-${day}`;
    }
    function normalizeStoredActivities(raw){
      try{
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return { events: parsed, biometricos: {} };
        if (parsed && Array.isArray(parsed.events)) return { events: parsed.events, biometricos: parsed.biometricos || {} };
      }catch(_){}
      return { events: [], biometricos: {} };
    }
    function saveActivitiesStore(){
      localStorage.setItem(LS_ACT, JSON.stringify({ events: activities, biometricos: dayBio }));
    }

    function hashColor(s){
      let h = 0; for(let i=0;i<s.length;i++) h = ((h<<5)-h) + s.charCodeAt(i);
      const hue = Math.abs(h)%360;
      return `hsl(${hue} 62% 56%)`;
    }

    function txt(es, en){ return uiLang === "en" ? en : es; }
    function valLang(v){ return (v && typeof v === "object") ? (v[uiLang] || v.es || v.en || "") : String(v || ""); }
    function isFav(id){ return favIds.includes(id); }
    function saveFavs(){ localStorage.setItem(LS_FAV, JSON.stringify(favIds)); }
    function toggleFav(id){
      if (!id) return;
      if (isFav(id)) favIds = favIds.filter(x => x !== id);
      else favIds.push(id);
      saveFavs();
      renderFoods();
      renderAll();
    }
    function normText(s){
      return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    }
    function nutrientName(key){
      const n = NUTRIENT_DEFS.find(x => x.key === key);
      return n ? (uiLang === "en" ? n.en : n.es) : key;
    }
    function nutrientKeyFromQuery(q){
      const nq = normText(q);
      if (!nq) return "";
      for (const n of NUTRIENT_DEFS){
        const bag = [n.key, n.es, n.en, ...(n.aliases||[])].map(normText);
        if (bag.includes(nq)) return n.key;
        if (bag.some(x => x.includes(nq))) return n.key;
      }
      return "";
    }
    function nutrientValueFromMode(n, key){
      const protein = num(n?.p);
      if (key === "leu") return num(n?.leu) || (protein * AMINO_COEF.leu);
      if (key === "lys") return num(n?.lys) || (protein * AMINO_COEF.lys);
      if (key === "met") return num(n?.met) || (protein * AMINO_COEF.met);
      if (key === "val") return num(n?.val) || (protein * AMINO_COEF.val);
      if (key === "iso") return num(n?.iso) || (protein * AMINO_COEF.iso);
      if (key === "phe") return num(n?.phe) || (protein * AMINO_COEF.phe);
      if (key === "thr") return num(n?.thr) || (protein * AMINO_COEF.thr);
      if (key === "trp") return num(n?.trp) || (protein * AMINO_COEF.trp);
      if (key === "his") return num(n?.his) || (protein * AMINO_COEF.his);
      return num(n?.[key]);
    }
    function bestNutrientInFood(food, key){
      let best = 0;
      for (const n of Object.values(food.modos || {})){
        const v = nutrientValueFromMode(n, key);
        if (v > best) best = v;
      }
      return best;
    }
    function phaseLabel(v){
      if (v === "hipertrofia") return txt("Hipertrofia", "Bulking");
      if (v === "definicion") return txt("Definicion", "Cutting");
      return txt("Mantenimiento", "Maintenance");
    }
    function syncLangButtons(){
      $("langEs").classList.toggle("active", uiLang === "es");
      $("langEn").classList.toggle("active", uiLang === "en");
    }
    function syncProfileToggleLabel(){
      const hidden = $("advancedBox").classList.contains("hidden");
      $("toggleAdvanced").title = hidden ? txt("Abrir ajustes", "Open settings") : txt("Cerrar ajustes", "Close settings");
    }
    function setLang(lang){
      uiLang = lang === "en" ? "en" : "es";
      localStorage.setItem(LS_LANG, uiLang);
      document.documentElement.lang = uiLang;
      buscar.placeholder = uiLang === "en" ? "rice, chicken, vitamin c, iron..." : "arroz, pollo, vitamina c, hierro...";
      $("recargarDB").textContent = txt("Cargar base", "Load DB");
      $("clearFilter").textContent = txt("Limpiar filtro", "Clear filter");
      $("onlyFavs").textContent = showOnlyFavs ? txt("Solo favoritos: ON", "Favorites only: ON") : txt("Solo favoritos: OFF", "Favorites only: OFF");
      $("guardarDia").textContent = txt("Guardar dia", "Save day");
      $("closeDay").textContent = txt("Cerrar dia", "Close day");
      $("exportAllJson").textContent = txt("Exportar historial JSON", "Export history JSON");
      $("exportAllCsv").textContent = txt("Exportar historial CSV", "Export history CSV");
      $("limpiar").textContent = txt("Reset Dia", "Reset Day");
      $("refreshAct").textContent = txt("Actualizar kcal/peso", "Refresh kcal/weight");
      syncLangButtons();
      syncProfileToggleLabel();
      if (activities.length){
        setStatus("actStatus", `${txt("Actividades cargadas","Activities loaded")}: ${activities.length} | ${txt("Gasto","Burned")}: ${fmt(activityKcal())} kcal`);
      } else {
        setStatus("actStatus", txt("Sin actividades cargadas.", "No activities loaded."));
      }
      if (nutrientFilterKey) setStatus("nutriStatus", `${txt("Filtrando por","Filtering by")} ${nutrientName(nutrientFilterKey)}.`);
      renderFoods();
      renderAll();
    }

    function normalizeFood(raw){
      const modos = {};
      const inModos = raw.modos || {};
      Object.keys(inModos).forEach((m) => {
        const n = inModos[m] || {};
        modos[m] = {
          kcal: num(n.kcal), p: num(n.p ?? n.proteina), c: num(n.c ?? n.carbos), g: num(n.g ?? n.grasas), f: num(n.f ?? n.fibra),
          fe: num(n.fe), mg: num(n.mg), zn: num(n.zn), pot: num(n.pot), na: num(n.na), vitc: num(n.vitc),
          creat: num(n.creat), ca: num(n.ca), phos: num(n.phos), sel: num(n.sel), cu: num(n.cu), mn: num(n.mn), iod: num(n.iod),
          vita: num(n.vita), vitd: num(n.vitd), vite: num(n.vite), vitk: num(n.vitk), b1: num(n.b1), b2: num(n.b2), b3: num(n.b3), b6: num(n.b6), b12: num(n.b12), fol: num(n.fol),
          leu: num(n.leu), lys: num(n.lys), met: num(n.met), val: num(n.val), iso: num(n.iso), phe: num(n.phe), thr: num(n.thr), trp: num(n.trp), his: num(n.his)
        };
      });
      const nombre = (raw.nombre && typeof raw.nombre === "object") ? raw.nombre : { es: String(raw.nombre||"Sin nombre"), en: String(raw.nombre||"Unnamed food") };
      const categoria = (raw.categoria && typeof raw.categoria === "object") ? raw.categoria : { es: String(raw.categoria||"General"), en: String(raw.categoria||"General") };
      const meta = raw.meta || {};
      return { id:String(raw.id || "food_"+Math.random().toString(36).slice(2)), nombre, categoria, modos, meta };
    }

    function normalizeDB(payload){
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.foods) ? payload.foods : []);
      return list.map(normalizeFood).filter(f => valLang(f.nombre) && Object.keys(f.modos).length>0);
    }

    function parseCSV(text){
      const lines = text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if (lines.length < 2) return [];
      const headers = lines[0].split(",").map(h=>h.trim().toLowerCase());
      const idx = (n) => headers.indexOf(n);
      const map = {};
      for(let i=1;i<lines.length;i++){
        const c = lines[i].split(",").map(x=>x.trim());
        const id = c[idx("id")] || `csv_${i}`;
        const item = map[id] || {id, nombre:{es:c[idx("nombre")]||"Sin nombre", en:c[idx("name_en")]||c[idx("nombre")]||"Unnamed food"}, categoria:{es:c[idx("categoria")]||"General", en:c[idx("category_en")]||c[idx("categoria")]||"General"}, modos:{}};
        const modo = c[idx("modo")] || "crudo";
        item.modos[modo] = {
          kcal:num(c[idx("kcal")]), p:num(c[idx("p")])||num(c[idx("proteina")]), c:num(c[idx("c")])||num(c[idx("carbos")]),
          g:num(c[idx("g")])||num(c[idx("grasas")]), f:num(c[idx("f")])||num(c[idx("fibra")]), fe:num(c[idx("fe")]), mg:num(c[idx("mg")]), zn:num(c[idx("zn")]), pot:num(c[idx("pot")]), na:num(c[idx("na")]), vitc:num(c[idx("vitc")]),
          creat:num(c[idx("creat")]), ca:num(c[idx("ca")]), phos:num(c[idx("phos")]), sel:num(c[idx("sel")]), cu:num(c[idx("cu")]), mn:num(c[idx("mn")]), iod:num(c[idx("iod")]),
          vita:num(c[idx("vita")]), vitd:num(c[idx("vitd")]), vite:num(c[idx("vite")]), vitk:num(c[idx("vitk")]), b1:num(c[idx("b1")]), b2:num(c[idx("b2")]), b3:num(c[idx("b3")]), b6:num(c[idx("b6")]), b12:num(c[idx("b12")]), fol:num(c[idx("fol")]),
          leu:num(c[idx("leu")]), lys:num(c[idx("lys")]), met:num(c[idx("met")]), val:num(c[idx("val")]), iso:num(c[idx("iso")]), phe:num(c[idx("phe")]), thr:num(c[idx("thr")]), trp:num(c[idx("trp")]), his:num(c[idx("his")])
        };
        map[id] = item;
      }
      return Object.values(map);
    }

    async function loadDefaultExternalDB(){
      try {
        const r = await fetch("./alimentos.base.es.json", {cache:"no-store"});
        if (r.ok){
          DB = normalizeDB(await r.json());
          localStorage.setItem(LS_DB, JSON.stringify(DB));
          setStatus("dbStatus", `Base cargada: ${DB.length} alimentos (json)`);
          return;
        }
      } catch(_) {}
      try{
        if (window.FOOD_DB_BUNDLE){
          DB = normalizeDB(window.FOOD_DB_BUNDLE);
          if (DB.length){
            localStorage.setItem(LS_DB, JSON.stringify(DB));
            setStatus("dbStatus", `Base cargada: ${DB.length} alimentos (bundle)`);
            return;
          }
        }
      } catch(_) {}
      const cached = normalizeDB(JSON.parse(localStorage.getItem(LS_DB)||"[]"));
      DB = cached;
      setStatus("dbStatus", DB.length ? `Base desde cache: ${DB.length} alimentos` : "No se pudo cargar base externa");
    }

    function foodsFiltrados(){
      const qRaw = (buscar.value||"").trim();
      const q = qRaw.toLowerCase();
      const typedKey = nutrientKeyFromQuery(qRaw);
      const activeKey = nutrientFilterKey || typedKey;
      const list = typedKey
        ? DB
        : DB.filter(f => valLang(f.nombre).toLowerCase().includes(q) || valLang(f.categoria).toLowerCase().includes(q));
      let filtered = activeKey ? list.filter(f => bestNutrientInFood(f, activeKey) > 0) : list;
      if (showOnlyFavs) filtered = filtered.filter(f => isFav(f.id));
      return filtered.sort((a,b) => {
        const af = isFav(a.id) ? 1 : 0;
        const bf = isFav(b.id) ? 1 : 0;
        if (bf !== af) return bf - af;
        if (activeKey){
          return bestNutrientInFood(b, activeKey) - bestNutrientInFood(a, activeKey);
        }
        return valLang(a.nombre).localeCompare(valLang(b.nombre), "es");
      });
    }

    function renderFoods(){
      const list = foodsFiltrados();
      foodSel.innerHTML = list.map(f => `<option value="${f.id}">${isFav(f.id) ? "★ " : ""}${valLang(f.nombre)} - ${valLang(f.categoria)}</option>`).join("");
      renderModos();
      renderFoodDetail();
    }

    function renderModos(){
      const f = DB.find(x => x.id === foodSel.value);
      if(!f){ modoSel.innerHTML = ""; return; }
      const modos = Object.keys(f.modos);
      modoSel.innerHTML = modos.map(m => `<option value="${m}">${m}</option>`).join("");
      if (modos.includes("cocido")) modoSel.value = "cocido";
      cantidad.value = modoSel.value === "unidad" ? 1 : 100;
      renderFoodDetail();
    }

    function renderFoodDetail(){
      const f = DB.find(x => x.id === foodSel.value);
      if(!f){
        $("foodDetail").innerHTML = `<small class="tiny">${txt("Selecciona un alimento para ver sus datos.","Select a food to see details.")}</small>`;
        return;
      }
      const modes = Object.entries(f.modos || {});
      const blocks = modes.map(([m, n]) => {
        const line1 = `${fmt(nutrientValueFromMode(n,"kcal"))} kcal | P ${fmt(nutrientValueFromMode(n,"p"))} g | C ${fmt(nutrientValueFromMode(n,"c"))} g | G ${fmt(nutrientValueFromMode(n,"g"))} g`;
        const line2 = `Fibra ${fmt(nutrientValueFromMode(n,"f"))} g | Fe ${fmt(nutrientValueFromMode(n,"fe"))} mg | Mg ${fmt(nutrientValueFromMode(n,"mg"))} mg | Zn ${fmt(nutrientValueFromMode(n,"zn"))} mg`;
        const line3 = `K ${fmt(nutrientValueFromMode(n,"pot"))} mg | Na ${fmt(nutrientValueFromMode(n,"na"))} mg | Vit C ${fmt(nutrientValueFromMode(n,"vitc"))} mg`;
        const line4 = `Leu ${fmt(nutrientValueFromMode(n,"leu"))} | Lys ${fmt(nutrientValueFromMode(n,"lys"))} | Met ${fmt(nutrientValueFromMode(n,"met"))}`;
        const line5 = `Creatina ${fmt(nutrientValueFromMode(n,"creat"))} mg | Ca ${fmt(nutrientValueFromMode(n,"ca"))} mg | P ${fmt(nutrientValueFromMode(n,"phos"))} mg`;
        return `<div class="food-mode"><b>${txt("Modo","Mode")}: ${m}</b><ul class="food-list"><li><strong>${line1}</strong></li><li>${line2}</li><li>${line3}</li><li>${line4}</li><li>${line5}</li></ul></div>`;
      }).join("");
      $("foodDetail").innerHTML = `<h3>${valLang(f.nombre)} <small class="tiny">(${valLang(f.categoria)})</small> <button id="favBtn" class="fav-btn">${isFav(f.id) ? txt("Quitar favorito","Unfavorite") : txt("Agregar favorito","Favorite")}</button></h3>${blocks}`;
      $("favBtn").onclick = () => toggleFav(f.id);
    }

    function factor(modo,cant){ return (modo==="unidad"||modo==="ml") ? cant : cant/100; }

    function add(){
      const f = DB.find(x => x.id === foodSel.value);
      const m = modoSel.value;
      const cant = num(cantidad.value);
      if(!f || !m || cant<=0) return;
      log.push({ id:Date.now()+Math.random(), foodId:f.id, color:hashColor(f.id), modo:m, cantidad:cant, n:f.modos[m], ts:new Date().toISOString() });
      localStorage.setItem(LS_LOG, JSON.stringify(log));
      renderAll();
    }

    function rem(id){ log = log.filter(x => x.id !== id); localStorage.setItem(LS_LOG, JSON.stringify(log)); renderAll(); }
    function clearAll(){
      if(!confirm(txt("Estas seguro de resetear el dia? Se borra la olla de hoy.","Are you sure you want to reset the day? Today's pot will be cleared."))) return;
      log=[];
      localStorage.setItem(LS_LOG,"[]");
      setStatus("perfilInfo", txt("Dia reseteado.","Day reset."));
      renderAll();
    }

    function downloadText(name, text, mime){
      const blob = new Blob([text], {type:mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    }

    function buildDayPayload(dayDate=todayStr(), closed=false){
      const {t} = totals();
      return {
        version: "1.0",
        date: dayDate,
        closed,
        saved_at: new Date().toISOString(),
        source_app: "nutricion.html",
        profile: perfil,
        burned_kcal: activityKcal(),
        totals: t,
        items: log.map(it => {
          const f = DB.find(x => x.id === it.foodId);
          return {
            id: it.id,
            food_id: it.foodId,
            food_name: f ? valLang(f.nombre) : it.foodId,
            mode: it.modo,
            amount: it.cantidad,
            nutrients_per_unit: it.n
          };
        })
      };
    }

    function savePayloadToArchive(payload){
      const arc = JSON.parse(localStorage.getItem(LS_ARCHIVE) || "{}");
      arc[payload.date] = payload;
      localStorage.setItem(LS_ARCHIVE, JSON.stringify(arc));
    }

    function archiveList(){
      const arc = JSON.parse(localStorage.getItem(LS_ARCHIVE) || "{}");
      return Object.values(arc).sort((a,b) => String(a.date).localeCompare(String(b.date)));
    }

    function archiveCSV(days){
      const head = "date,closed,food_id,food_name,mode,amount,kcal,p,c,g,f,fe,mg,zn,pot,na,vitc,creat,ca,phos";
      const rows = [];
      for (const d of days){
        for (const it of (d.items || [])){
          const n = it.nutrients_per_unit || {};
          rows.push([
            d.date, d.closed ? 1 : 0, it.food_id || "", (it.food_name || "").replace(/,/g," "),
            it.mode || "", it.amount || 0,
            n.kcal || 0, n.p || 0, n.c || 0, n.g || 0, n.f || 0, n.fe || 0, n.mg || 0, n.zn || 0,
            n.pot || 0, n.na || 0, n.vitc || 0, n.creat || 0, n.ca || 0, n.phos || 0
          ].join(","));
        }
      }
      return [head, ...rows].join("\n");
    }

    async function saveDay(){
      const payload = buildDayPayload(todayStr(), false);
      savePayloadToArchive(payload);
      const text = JSON.stringify(payload, null, 2);
      const fileName = `nutricion_${payload.date}.json`;
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(text);
          await writable.close();
          setStatus("dataStatus", txt("Dia guardado en storage y archivo JSON.","Day saved to storage and JSON file."));
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }
      downloadText(fileName, text, "application/json");
      setStatus("dataStatus", txt("Dia guardado en storage y archivo JSON.","Day saved to storage and JSON file."));
    }

    async function closeDay(){
      const payload = buildDayPayload(todayStr(), true);
      savePayloadToArchive(payload);
      const fileName = `cierre_${payload.date}.json`;
      const text = JSON.stringify(payload, null, 2);
      downloadText(fileName, text, "application/json");
      setStatus("dataStatus", txt("Dia cerrado: guardado en storage y JSON descargado.","Day closed: saved to storage and JSON downloaded."));
    }

    function exportAllHistoryJSON(){
      const days = archiveList();
      const out = { version:"1.0", exported_at:new Date().toISOString(), days };
      downloadText(`historial_total_${todayStr()}.json`, JSON.stringify(out, null, 2), "application/json");
      setStatus("dataStatus", txt("Historial JSON exportado.","History JSON exported."));
    }

    function exportAllHistoryCSV(){
      const days = archiveList();
      const csv = archiveCSV(days);
      downloadText(`historial_total_${todayStr()}.csv`, csv, "text/csv");
      setStatus("dataStatus", txt("Historial CSV exportado.","History CSV exported."));
    }

    function tmb(){
      const p = perfil;
      const base = 10*p.peso + 6.25*p.altura - 5*p.edad;
      return p.sexo === "m" ? base + 5 : base - 161;
    }

    function kcalObjetivo(){
      const b = tmb() * 1.35;
      if (perfil.fase === "hipertrofia") return b * 1.12;
      if (perfil.fase === "definicion") return b * 0.85;
      return b;
    }

    function saveProfile(){
      perfil = { peso:num($("peso").value)||80, altura:num($("altura").value)||175, edad:num($("edad").value)||30, sexo:$("sexo").value||"m", fase:$("fase").value||"mantenimiento" };
      localStorage.setItem(LS_PROFILE, JSON.stringify(perfil));
      $("advancedBox").classList.add("hidden");
      syncProfileToggleLabel();
      setStatus("perfilInfo", txt("Perfil guardado.", "Profile saved."));
      const btn = $("guardarPerfil");
      const prev = btn.textContent;
      btn.textContent = txt("Guardado", "Saved");
      setTimeout(() => { btn.textContent = prev; }, 900);
      renderAll();
    }

    function totals(){
      const t = {kcal:0,p:0,c:0,g:0,f:0,fe:0,mg:0,zn:0,pot:0,na:0,vitc:0,creat:0,ca:0,phos:0,sel:0,cu:0,mn:0,iod:0,vita:0,vitd:0,vite:0,vitk:0,b1:0,b2:0,b3:0,b6:0,b12:0,fol:0,leu:0,lys:0,met:0,val:0,iso:0,phe:0,thr:0,trp:0,his:0};
      const contrib = {}; // nutrient -> foodId -> value

      function addC(nutrient, foodId, val){
        if(!contrib[nutrient]) contrib[nutrient] = {};
        contrib[nutrient][foodId] = (contrib[nutrient][foodId]||0) + val;
      }

      for(const it of log){
        const fac = factor(it.modo, it.cantidad);
        const n = it.n || {};
        const protein = num(n.p);
        const aa = {
          leu: num(n.leu) || protein*AMINO_COEF.leu,
          lys: num(n.lys) || protein*AMINO_COEF.lys,
          met: num(n.met) || protein*AMINO_COEF.met,
          val: num(n.val) || protein*AMINO_COEF.val,
          iso: num(n.iso) || protein*AMINO_COEF.iso,
          phe: num(n.phe) || protein*AMINO_COEF.phe,
          thr: num(n.thr) || protein*AMINO_COEF.thr,
          trp: num(n.trp) || protein*AMINO_COEF.trp,
          his: num(n.his) || protein*AMINO_COEF.his,
        };

        const keys = ["kcal","p","c","g","f","fe","mg","zn","pot","na","vitc","creat","ca","phos","sel","cu","mn","iod","vita","vitd","vite","vitk","b1","b2","b3","b6","b12","fol"];
        for(const k of keys){
          const val = num(n[k]) * fac;
          t[k] += val;
          addC(k, it.foodId, val);
        }

        for(const k of Object.keys(aa)){
          const val = aa[k] * fac;
          t[k] += val;
          addC(k, it.foodId, val);
        }
      }

      return { t, contrib };
    }

    function activityKcal(){
      return activities.reduce((acc, e) => acc + num(e.kcal_active), 0);
    }

    function goals(){
      const kg = perfil.peso || 80;
      return {
        kcal: kcalObjetivo(), p: kg*DEF_TARGETS.p, c: kg*DEF_TARGETS.c, g: kg*DEF_TARGETS.g, f: DEF_TARGETS.f,
        fe: DEF_TARGETS.fe, mg: DEF_TARGETS.mg, zn: DEF_TARGETS.zn, pot: DEF_TARGETS.pot, na: DEF_TARGETS.na, vitc: DEF_TARGETS.vitc,
        creat: DEF_TARGETS.creat, ca: DEF_TARGETS.ca, phos: DEF_TARGETS.phos, sel: DEF_TARGETS.sel, cu: DEF_TARGETS.cu, mn: DEF_TARGETS.mn, iod: DEF_TARGETS.iod,
        vita: DEF_TARGETS.vita, vitd: DEF_TARGETS.vitd, vite: DEF_TARGETS.vite, vitk: DEF_TARGETS.vitk, b1: DEF_TARGETS.b1, b2: DEF_TARGETS.b2, b3: DEF_TARGETS.b3, b6: DEF_TARGETS.b6, b12: DEF_TARGETS.b12, fol: DEF_TARGETS.fol,
        leu: kg*39, lys: kg*30, met: kg*15, val: kg*26, iso: kg*20, phe: kg*25, thr: kg*15, trp: kg*4, his: kg*10
      };
    }

    function stackedBar(goal, contribMap){
      const safeGoal = Math.max(num(goal), 1);
      const entries = Object.entries(contribMap || {}).sort((a,b)=>b[1]-a[1]);
      if (!entries.length) return `<div class="bar"></div>`;
      const segs = entries.map(([foodId,val]) => {
        const w = Math.max((val/safeGoal)*100, 0.8);
        return `<div class="seg" title="${foodId}: ${fmt(val)}" style="width:${w}%;background:${hashColor(foodId)}"></div>`;
      }).join("");
      return `<div class="bar">${segs}</div>`;
    }

    function topContrib(contribMap, goal){
      const safeGoal = Math.max(num(goal), 1);
      const items = Object.entries(contribMap || {}).sort((a,b)=>b[1]-a[1]).slice(0,3);
      if (!items.length) return "";
      return items.map(([foodId,val]) => {
        const f = DB.find(x => x.id === foodId);
        const name = f ? valLang(f.nombre) : foodId;
        const pct = (val / safeGoal) * 100;
        return `${name} ${fmt(pct)}%`;
      }).join(" | ");
    }

    function metric(key, label, unit, t, g, contrib, hideLabel=false){
      const v = num(t[key]), goal = Math.max(num(g[key]), 1), r = v/goal;
      const used = Math.min(r*100,160), barStack = stackedBar(goal, contrib[key]);
      const tops = topContrib(contrib[key], goal);
      const title = hideLabel ? "" : `<span>${label}</span>`;
      return `<div class="metric clickable" data-nk="${key}" title="${txt("Click para sugerir alimentos de este nutriente","Click to suggest foods for this nutrient")}"><div class="meta">${title}<b>${fmt(v)} / ${fmt(goal)} ${unit} (${Math.round(r*100)}%)</b></div>${barStack}<div class="tiny">${txt("Cobertura","Coverage")}: ${fmt(used)}%</div><div class="tiny">Top: ${tops || txt("sin datos","no data")}</div></div>`;
    }

    function renderLegend(){
      const ids = [...new Set(log.map(x => x.foodId))];
      $("legend").innerHTML = ids.slice(0,24).map(id => {
        const f = DB.find(x => x.id===id);
        const name = f ? valLang(f.nombre) : id;
        return `<span class="tiny"><span class="dot" style="background:${hashColor(id)}"></span>${name}</span>`;
      }).join("");
    }

    function renderMtor(t){
      const leucina = t.leu/1000;
      const prot = t.p;
      let maxLeuIngesta = 0, maxProtIngesta = 0;
      for (const it of log){
        const fac = factor(it.modo, it.cantidad), n = it.n || {}, p = num(n.p) * fac;
        const leu = (num(n.leu) || (num(n.p) * AMINO_COEF.leu)) * fac / 1000;
        if (leu > maxLeuIngesta) maxLeuIngesta = leu;
        if (p > maxProtIngesta) maxProtIngesta = p;
      }

      let msg = `Dia: leucina ${fmt(leucina)} g | proteina ${fmt(prot)} g. Ingesta max: leucina ${fmt(maxLeuIngesta)} g | proteina ${fmt(maxProtIngesta)} g.`;
      if (leucina < 8) msg += " Falta señal mTOR diaria (subi proteína completa).";
      if (maxLeuIngesta < 2) msg += " Ninguna ingesta llega a ~2 g de leucina.";
      if (maxProtIngesta > (perfil.peso*0.6)) msg += " Una ingesta tiene proteína muy alta; posible rendimiento decreciente.";
      if (prot > (perfil.peso*2.4)) msg += " Proteína diaria alta; revisá eficiencia.";
      $("mtor").textContent = msg;
    }
    function renderAlerts(t,g){
      const items = [];
      if (t.f < 20) items.push(txt("Fibra baja: subi verduras, legumbres o semillas.","Low fiber: increase veggies, legumes or seeds."));
      if (t.vitc < 60) items.push(txt("Vitamina C baja: agrega frutas o verduras frescas.","Low vitamin C: add fruits or fresh vegetables."));
      if (t.p < (perfil.peso*1.2)) items.push(txt("Proteina baja para objetivo: puede faltar recuperacion.","Protein may be low for your goal."));
      if (t.na > 3000) items.push(txt("Sodio alto: revisa sal y ultraprocesados.","Sodium is high: check salt and processed foods."));
      if (t.kcal > g.kcal*1.2) items.push(txt("Kcal por encima del objetivo de hoy.","Calories are above today's target."));
      if (t.kcal < g.kcal*0.7) items.push(txt("Kcal por debajo del objetivo de hoy.","Calories are below today's target."));
      $("alerts").innerHTML = items.length
        ? `<ul class="warn-list">${items.map(x => `<li><strong>${x}</strong></li>`).join("")}</ul>`
        : `<small class="tiny">${txt("Sin alertas importantes por ahora.","No major alerts for now.")}</small>`;
    }

    function bindMetricClicks(){
      document.querySelectorAll(".metric[data-nk]").forEach((el) => {
        el.onclick = () => {
          const k = el.dataset.nk || "";
          if (!k) return;
          nutrientFilterKey = k;
          $("buscar").value = nutrientName(k);
          setStatus("nutriStatus", `${txt("Filtrando por","Filtering by")} ${nutrientName(k)}.`);
          renderFoods();
        };
      });
    }

    function renderAll(){
      $("peso").value = perfil.peso; $("altura").value = perfil.altura; $("edad").value = perfil.edad; $("sexo").value = perfil.sexo; $("fase").value = perfil.fase;
      $("profileLine").innerHTML = [
        `<span class="k">${txt("Edad","Age")}</span>${fmt(perfil.edad)}`,
        `<span class="k">${txt("Altura","Height")}</span>${fmt(perfil.altura)} cm`,
        `<span class="k">${txt("Peso","Weight")}</span>${fmt(perfil.peso)} kg`,
        `<span class="k">${txt("Fase","Phase")}</span>${phaseLabel(perfil.fase)}`
      ].join(" | ");

      const {t, contrib} = totals();
      const g = goals();
      const burned = activityKcal();
      const net = t.kcal - burned;

      setStatus("perfilInfo", `TMB: ${fmt(tmb())} | Objetivo fase: ${fmt(g.kcal)} kcal`);

      $("olla").innerHTML = log.length
        ? log.slice().reverse().map(it => {
            const f = DB.find(x => x.id === it.foodId);
            const n = f ? valLang(f.nombre) : it.foodId;
            return `<div class="it"><div><strong style="color:${it.color}">${n}</strong><small>${it.cantidad} ${it.modo}</small></div><button class="del" onclick="rem(${it.id})">x</button></div>`;
          }).join("")
        : `<small class="tiny">${txt("Todavia no agregaste ingredientes.","No ingredients added yet.")}</small>`;

      $("cards").innerHTML = [
        [txt("Kcal","Kcal"), metric("kcal",txt("Kcal","Kcal"),"kcal",t,g,contrib,true), "kcal"],
        [txt("Proteina","Protein"), metric("p",txt("Proteina","Protein"),"g",t,g,contrib,true), "protein"],
        [txt("Carbohidratos","Carbohydrates"), metric("c",txt("Carbos","Carbs"),"g",t,g,contrib,true), "carbs"]
      ].map(x => `<div class="card macro ${x[2]}"><div class="k">${x[0]}</div>${x[1]}</div>`).join("");

      $("substats").innerHTML = [
        `<div class="sub">${txt("Kcal gastadas","Kcal burned")}: <b>${fmt(burned)}</b> kcal</div>`,
        `<div class="sub">${txt("Balance neto","Net balance")}: <b>${fmt(net)}</b> kcal</div>`
      ].join("");

      $("aminoBox").innerHTML = [
        metric("leu",txt("Leucina","Leucine"),"mg",t,g,contrib), metric("lys",txt("Lisina","Lysine"),"mg",t,g,contrib), metric("met",txt("Metionina","Methionine"),"mg",t,g,contrib),
        metric("val",txt("Valina","Valine"),"mg",t,g,contrib), metric("iso",txt("Isoleucina","Isoleucine"),"mg",t,g,contrib), metric("phe",txt("Fenilalanina","Phenylalanine"),"mg",t,g,contrib),
        metric("thr",txt("Treonina","Threonine"),"mg",t,g,contrib), metric("trp",txt("Triptofano","Tryptophan"),"mg",t,g,contrib), metric("his",txt("Histidina","Histidine"),"mg",t,g,contrib)
      ].join("");

      $("microBox").innerHTML = [
        metric("fe",txt("Hierro","Iron"),"mg",t,g,contrib), metric("mg",txt("Magnesio","Magnesium"),"mg",t,g,contrib), metric("zn",txt("Zinc","Zinc"),"mg",t,g,contrib),
        metric("pot",txt("Potasio","Potassium"),"mg",t,g,contrib), metric("na",txt("Sodio","Sodium"),"mg",t,g,contrib), metric("vitc",txt("Vitamina C","Vitamin C"),"mg",t,g,contrib)
      ].join("");

      $("extraBox").innerHTML = [
        metric("creat",txt("Creatina","Creatine"),"mg",t,g,contrib), metric("ca",txt("Calcio","Calcium"),"mg",t,g,contrib), metric("phos",txt("Fosforo","Phosphorus"),"mg",t,g,contrib),
        metric("sel",txt("Selenio","Selenium"),"mcg",t,g,contrib), metric("cu",txt("Cobre","Copper"),"mg",t,g,contrib), metric("mn",txt("Manganeso","Manganese"),"mg",t,g,contrib),
        metric("iod",txt("Yodo","Iodine"),"mcg",t,g,contrib), metric("vita",txt("Vitamina A","Vitamin A"),"mcg",t,g,contrib), metric("vitd",txt("Vitamina D","Vitamin D"),"mcg",t,g,contrib),
        metric("vite",txt("Vitamina E","Vitamin E"),"mg",t,g,contrib), metric("vitk",txt("Vitamina K","Vitamin K"),"mcg",t,g,contrib), metric("b1",txt("Vitamina B1","Vitamin B1"),"mg",t,g,contrib),
        metric("b2",txt("Vitamina B2","Vitamin B2"),"mg",t,g,contrib), metric("b3",txt("Vitamina B3","Vitamin B3"),"mg",t,g,contrib), metric("b6",txt("Vitamina B6","Vitamin B6"),"mg",t,g,contrib),
        metric("b12",txt("Vitamina B12","Vitamin B12"),"mcg",t,g,contrib), metric("fol",txt("Folato","Folate"),"mcg",t,g,contrib)
      ].join("");

      renderLegend();
      renderMtor(t);
      renderAlerts(t,g);
      bindMetricClicks();
    }

    async function handleFoodFile(file){
      const text = await file.text();
      const ext = (file.name.split(".").pop()||"").toLowerCase();
      let loaded = [];
      if (ext === "json") loaded = normalizeDB(JSON.parse(text));
      else if (ext === "csv") loaded = normalizeDB(parseCSV(text));
      else throw new Error("Formato no soportado");
      if (!loaded.length) throw new Error("Archivo vacio o invalido");
      DB = loaded;
      localStorage.setItem(LS_DB, JSON.stringify(DB));
      setStatus("dbStatus", `Base cargada manualmente: ${DB.length} alimentos (${file.name})`);
      renderFoods(); renderAll();
    }

    function parseActivitiesCSV(text){
      const lines = text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if (lines.length < 2) return { events: [], biometricos: {} };
      const h = lines[0].split(",").map(x=>x.trim().toLowerCase());
      const idx = (n) => h.indexOf(n);
      const out = [];
      let bio = {};
      for(let i=1;i<lines.length;i++){
        const c = lines[i].split(",").map(x=>x.trim());
        if (i === 1){
          bio = {
            wake_time: c[idx("wake_time")] || "",
            sleep_time: c[idx("sleep_time")] || "",
            siesta_time: c[idx("siesta_time")] || "",
            wake_weight_kg: num(c[idx("wake_weight_kg")])
          };
        }
        out.push({
          id: c[idx("id")] || `evt_${i}`,
          date: c[idx("date")] || "",
          activity_type: c[idx("activity_type")] || c[idx("actividad")] || "actividad",
          duration_min: num(c[idx("duration_min")]),
          kcal_active: num(c[idx("kcal_active")]),
          source: c[idx("source")] || "manual",
          note: c[idx("note")] || ""
        });
      }
      return { events: out, biometricos: bio };
    }

    function applyActivityPayload(payload){
      const p = normalizeStoredActivities(payload);
      activities = (p.events || []).map(e => ({
        id:e.id || `evt_${Math.random().toString(36).slice(2)}`,
        date:e.date || "",
        activity_type:e.activity_type || "actividad",
        duration_min:num(e.duration_min),
        kcal_active:num(e.kcal_active),
        source:e.source || "manual"
      }));
      dayBio = p.biometricos || {};
      const w = num(dayBio.wake_weight_kg || dayBio.weight_kg);
      if (w > 20 && w < 300) {
        perfil.peso = w;
        localStorage.setItem(LS_PROFILE, JSON.stringify(perfil));
      }
      saveActivitiesStore();
      setStatus("actStatus", `${txt("Actividades cargadas","Activities loaded")}: ${activities.length} | ${txt("Gasto","Burned")}: ${fmt(activityKcal())} kcal`);
      renderAll();
    }

    async function handleActivityFile(file){
      const text = await file.text();
      const ext = (file.name.split(".").pop()||"").toLowerCase();
      let payload = { events: [], biometricos: {} };
      if (ext === "json") {
        const d = JSON.parse(text);
        payload = Array.isArray(d?.events) || d?.biometricos ? d : { events: (Array.isArray(d) ? d : []), biometricos: {} };
      } else if (ext === "csv") payload = parseActivitiesCSV(text);
      else throw new Error("Formato no soportado");
      applyActivityPayload(payload);
    }

    async function refreshActivitiesFromDefault(){
      try{
        const r = await fetch("./actividades.export.json", { cache:"no-store" });
        if (!r.ok) throw new Error("No existe actividades.export.json");
        const payload = await r.json();
        applyActivityPayload(payload);
      } catch (err){
        setStatus("actStatus", `${txt("Error al actualizar","Refresh error")}: ${err.message}`);
      }
    }

    $("guardarPerfil").onclick = saveProfile;
    $("langEs").onclick = () => setLang("es");
    $("langEn").onclick = () => setLang("en");
    $("toggleAdvanced").onclick = () => { $("advancedBox").classList.toggle("hidden"); syncProfileToggleLabel(); };
    $("refreshAct").onclick = refreshActivitiesFromDefault;
    $("agregar").onclick = add;
    $("limpiar").onclick = clearAll;
    $("guardarDia").onclick = saveDay;
    $("closeDay").onclick = closeDay;
    $("exportAllJson").onclick = exportAllHistoryJSON;
    $("exportAllCsv").onclick = exportAllHistoryCSV;
    $("recargarDB").onclick = async () => { await loadDefaultExternalDB(); renderFoods(); renderAll(); };
    $("clearFilter").onclick = () => {
      buscar.value = "";
      nutrientFilterKey = "";
      setStatus("nutriStatus", txt("Filtro limpio.","Filter cleared."));
      renderFoods();
    };
    $("onlyFavs").onclick = () => {
      showOnlyFavs = !showOnlyFavs;
      $("onlyFavs").textContent = showOnlyFavs ? txt("Solo favoritos: ON", "Favorites only: ON") : txt("Solo favoritos: OFF", "Favorites only: OFF");
      renderFoods();
    };
    buscar.oninput = () => {
      nutrientFilterKey = "";
      const key = nutrientKeyFromQuery(buscar.value);
      if (key) {
        setStatus("nutriStatus", `${txt("Filtrando por","Filtering by")} ${nutrientName(key)}.`);
      } else if (buscar.value.trim()) {
        setStatus("nutriStatus", txt("Busqueda por nombre/categoria.", "Search by name/category."));
      } else {
        setStatus("nutriStatus", txt("Tip: si escribis un nutriente te lista alimentos ricos en ese nutriente.","Tip: type a nutrient to list foods rich in it."));
      }
      renderFoods();
    };
    foodSel.onchange = renderModos;
    window.rem = rem;

    (async () => {
      await loadDefaultExternalDB();
      setLang(uiLang);
    })();
