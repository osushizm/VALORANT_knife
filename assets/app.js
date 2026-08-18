(async function(){
  const res = await fetch('assets/data.json');
  const rows = await res.json();

  const YT_WATCH = id => `https://www.youtube.com/watch?v=${id}`;
  const YT_THUMB = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function firstMatchedThumb(r){
    const m = r.results.find(x => x.matched && x.id);
    return m ? m.id : null;
  }

  function formatViews(n){
    if (n == null) return '—';
    if (n >= 100000000) return (n/100000000).toFixed(n%100000000===0?0:1) + '億';
    if (n >= 10000) return (n/10000).toFixed(n%10000===0?0:1) + '万';
    return n.toLocaleString('ja-JP');
  }

  const totalItems = rows.reduce((a,r)=>a+r.total,0);
  const matchedItems = rows.reduce((a,r)=>a+r.matchedCount,0);
  const missingItems = totalItems - matchedItems;
  const pct = Math.round((matchedItems/totalItems)*1000)/10;
  const noneCount = rows.filter(r=>r.noneDone).length;
  const partialCount = rows.filter(r=>!r.allDone && !r.noneDone).length;
  const doneCount = rows.filter(r=>r.allDone).length;
  const totalViews = rows.reduce((a,r)=>a+r.views,0);

  document.getElementById('dash').innerHTML = `
    <div class="coverage-cell">
      <div class="stat-label">投稿カバー率</div>
      <div class="stat-value">${pct}<small>%</small></div>
      <div class="coverage-bar"><span style="width:${pct}%"></span></div>
      <div class="coverage-note">${matchedItems} / ${totalItems} 項目を投稿済み</div>
    </div>
    <div>
      <div class="stat-label">完全に未投稿</div>
      <div class="stat-value c-bad">${noneCount}<small>コレクション</small></div>
    </div>
    <div>
      <div class="stat-label">一部未投稿</div>
      <div class="stat-value c-warn">${partialCount}<small>コレクション</small></div>
    </div>
    <div>
      <div class="stat-label">コンプリート済み</div>
      <div class="stat-value c-good">${doneCount}<small>/ ${rows.length}</small></div>
    </div>
    <div>
      <div class="stat-label">未投稿 項目数</div>
      <div class="stat-value c-bad">${missingItems}</div>
    </div>
    <div>
      <div class="stat-label">投稿済み 項目数</div>
      <div class="stat-value">${matchedItems}<small>本</small></div>
    </div>
    <div>
      <div class="stat-label">合計再生数(ナイフ動画)</div>
      <div class="stat-value">${formatViews(totalViews)}<small>回</small></div>
    </div>
  `;

  document.getElementById('cnt-missing').textContent = noneCount + '件';
  document.getElementById('cnt-partial').textContent = partialCount + '件';
  document.getElementById('cnt-all').textContent = rows.length + '件';

  // ---- Fully missing cards ----
  const missGrid = document.getElementById('missing-grid');
  rows.filter(r=>r.noneDone).forEach(r=>{
    const el = document.createElement('div');
    el.className = 'miss-card';
    el.innerHTML = `<div class="coll">${esc(r.collection)}</div><div class="name">${esc(r.name)}</div>${r.act ? `<div class="act">${esc(r.act)}</div>` : ''}`;
    missGrid.appendChild(el);
  });

  // ---- Partial rows (with links to what IS posted) ----
  const partList = document.getElementById('partial-list');
  rows.filter(r=>!r.allDone && !r.noneDone).forEach(r=>{
    const el = document.createElement('div');
    el.className = 'partial-row';
    const missing = r.results.filter(x=>!x.matched).map(x=>`<span class="chip">${esc(x.label)}</span>`).join('');
    const posted = r.results.filter(x=>x.matched).map(x=>`
      <a class="posted-thumb" href="${YT_WATCH(x.id)}" target="_blank" rel="noopener" title="${esc(x.t)} · ${formatViews(x.views)}回視聴">
        <img loading="lazy" src="${YT_THUMB(x.id)}" alt="">
        <span>${esc(x.label)}<b>${formatViews(x.views)}回</b></span>
      </a>
    `).join('');
    el.innerHTML = `
      <div class="partial-top">
        <div class="titles">
          <div class="coll">${esc(r.collection)}${r.act ? ' · ' + esc(r.act) : ''}</div>
          <div class="name">${esc(r.name)}</div>
        </div>
        <div class="prog">${r.matchedCount}/${r.total} 投稿済み</div>
        <div class="chips">${missing}</div>
      </div>
      <div class="posted-strip">${posted}</div>
    `;
    partList.appendChild(el);
  });

  // ---- Tag filter panel ----
  const WEAPON_TAGS = ['カラムビット','バタフライナイフ','扇','アックス','ダガー・クナイ','拳・グローブ','ハンマー・メイス','鎌','杖・ロッド','爪','ソード・ブレード','バット・棒','ナイフ','その他'];
  const EVENT_TAGS = ['Champions','VCT','期間限定'];
  const SOURCE_TAGS = ['ストア','バトルパス'];

  const tagCounts = new Map();
  rows.forEach(r => r.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t)||0)+1)));

  const knownSet = new Set([...WEAPON_TAGS, ...EVENT_TAGS, ...SOURCE_TAGS]);
  const colorTags = Array.from(tagCounts.keys())
    .filter(t => !knownSet.has(t))
    .sort((a,b) => tagCounts.get(b) - tagCounts.get(a));
  const weaponTagsPresent = WEAPON_TAGS.filter(t => tagCounts.has(t));
  const eventTagsPresent = EVENT_TAGS.filter(t => tagCounts.has(t));

  const selectedTags = new Set();

  function tagChip(t){
    return `<button type="button" class="tag-btn" data-tag="${esc(t)}">${esc(t)}<span style="opacity:.6"> ${tagCounts.get(t)}</span></button>`;
  }

  const tagPanel = document.getElementById('tag-panel');
  tagPanel.innerHTML = `
    <div class="tag-row"><div class="tag-row-label">区分</div><div class="tag-chips">${SOURCE_TAGS.map(tagChip).join('')}</div></div>
    <div class="tag-row"><div class="tag-row-label">武器種</div><div class="tag-chips">${weaponTagsPresent.map(tagChip).join('')}</div></div>
    <div class="tag-row"><div class="tag-row-label">イベント</div><div class="tag-chips">${eventTagsPresent.map(tagChip).join('')}</div></div>
    <div class="tag-row"><div class="tag-row-label">色</div><div class="tag-chips collapsed" id="color-chips">${colorTags.map(tagChip).join('')}</div></div>
    <div class="tag-row"><div class="tag-row-label"></div><button type="button" class="tag-more" id="color-more">色をすべて表示 (${colorTags.length})</button></div>
    <div class="tag-footer">
      <div class="tag-selected" id="tag-selected"><span class="none">タグ未選択(すべて表示中)</span></div>
      <button type="button" class="tag-clear" id="tag-clear" disabled>クリア</button>
    </div>
  `;

  document.getElementById('color-more').addEventListener('click', () => {
    const el = document.getElementById('color-chips');
    const btn = document.getElementById('color-more');
    const collapsed = el.classList.toggle('collapsed');
    btn.textContent = collapsed ? `色をすべて表示 (${colorTags.length})` : '色をたたむ';
  });

  tagPanel.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const t = btn.dataset.tag;
    if (selectedTags.has(t)) selectedTags.delete(t); else selectedTags.add(t);
    syncTagUI();
    render();
  });

  document.getElementById('tag-clear').addEventListener('click', () => {
    selectedTags.clear();
    syncTagUI();
    render();
  });

  function syncTagUI(){
    tagPanel.querySelectorAll('.tag-btn').forEach(b => b.classList.toggle('on', selectedTags.has(b.dataset.tag)));
    const sel = document.getElementById('tag-selected');
    const clearBtn = document.getElementById('tag-clear');
    if (selectedTags.size === 0) {
      sel.innerHTML = '<span class="none">タグ未選択(すべて表示中)</span>';
      clearBtn.disabled = true;
    } else {
      sel.innerHTML = Array.from(selectedTags).map(t => `<span>#${esc(t)}</span>`).join('');
      clearBtn.disabled = false;
    }
  }

  // ---- Full table ----
  const tbody = document.getElementById('tbody');
  const emptyNote = document.getElementById('empty-note');
  let statusFilter = 'all';
  let query = '';
  let sortMode = 'default';

  function statusOf(r){ return r.allDone ? 'done' : (r.noneDone ? 'none' : 'partial'); }
  function statusLabel(s){ return s==='done' ? '完了' : (s==='none' ? '未投稿' : '一部'); }

  function render(){
    tbody.innerHTML = '';
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(r=>{
      const st = statusOf(r);
      if (statusFilter === 'incomplete' && st === 'done') return false;
      if (statusFilter === 'none' && st !== 'none') return false;
      if (q && !(r.collection.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))) return false;
      if (selectedTags.size && !Array.from(selectedTags).every(t => r.tags.includes(t))) return false;
      return true;
    });
    if (sortMode === 'views-desc') filtered.sort((a,b) => b.views - a.views);
    if (sortMode === 'views-asc') filtered.sort((a,b) => a.views - b.views);
    emptyNote.style.display = filtered.length ? 'none' : 'block';

    filtered.forEach(r => {
      const st = statusOf(r);
      const pctRow = Math.round((r.matchedCount/r.total)*100);
      const thumbId = firstMatchedThumb(r);
      const tr = document.createElement('tr');
      tr.className = 'data-row';
      tr.innerHTML = `
        <td class="col-coll">${r.section === 'Store' ? 'Store' : 'Battle Pass'}</td>
        <td>
          <div class="name-cell">
            ${thumbId ? `<img loading="lazy" src="${YT_THUMB(thumbId)}" alt="">` : `<img alt="" style="visibility:hidden">`}
            <div class="txt">
              <div class="col-name">${esc(r.name)}</div>
              <div class="col-coll">${esc(r.collection)}</div>
              <div class="row-tags">${r.tags.filter(t => (WEAPON_TAGS.includes(t) && t !== 'その他') || EVENT_TAGS.includes(t)).map(t=>`<span class="row-tag">${esc(t)}</span>`).join('')}</div>
            </div>
          </div>
        </td>
        <td class="col-act">${r.act ? esc(r.act) : '&mdash;'}</td>
        <td class="col-prog"><span class="mini-bar"><span style="width:${pctRow}%"></span></span>${r.matchedCount}/${r.total}</td>
        <td class="col-views">${r.views ? formatViews(r.views) : '&mdash;'}</td>
        <td><span class="pill ${st}">${statusLabel(st)}</span></td>
      `;
      const exp = document.createElement('tr');
      exp.className = 'exp-row';
      exp.style.display = 'none';
      const items = r.results.map(x => {
        if (x.matched) {
          return `
            <a class="exp-item ok" href="${YT_WATCH(x.id)}" target="_blank" rel="noopener">
              <img class="thumb play-badge" loading="lazy" src="${YT_THUMB(x.id)}" alt="">
              <span class="meta">
                <span class="lbl">${esc(x.label)}</span>
                <span class="ttl">${esc(x.t)}</span>
                <span class="views">${formatViews(x.views)} 回視聴</span>
              </span>
            </a>`;
        }
        return `
          <div class="exp-item no">
            <span class="thumb placeholder">—</span>
            <span class="meta">
              <span class="lbl">${esc(x.label)}</span>
              <span class="ttl">未投稿</span>
            </span>
          </div>`;
      }).join('');
      exp.innerHTML = `<td colspan="6"><div class="exp-panel">${items}</div></td>`;

      tr.addEventListener('click', () => {
        exp.style.display = exp.style.display === 'none' ? 'table-row' : 'none';
      });

      tbody.appendChild(tr);
      tbody.appendChild(exp);
    });
  }

  document.getElementById('search').addEventListener('input', e => { query = e.target.value; render(); });
  document.getElementById('sort-select').addEventListener('change', e => { sortMode = e.target.value; render(); });
  document.querySelectorAll('#seg-status button').forEach(b=>{
    b.addEventListener('click', () => {
      document.querySelectorAll('#seg-status button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      statusFilter = b.dataset.f;
      render();
    });
  });
  render();
})();
