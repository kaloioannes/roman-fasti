'use strict';
// project.json owns chronology. Republic URLs alone use positive BCE keys.
window.FastiPeriods = (() => {
  let catalogue;
  const read = () => catalogue ||= fetch('../project.json').then(response => {
    if (!response.ok) throw new Error('时期目录暂时无法载入');
    return response.json();
  }).then(project => project.periods.filter(p => p.status === 'available')).catch(error => {
    catalogue = null;
    throw error;
  });
  const when = y => y < 0 ? `前${-y}年` : `${y}年`;
  function mount(id, year) {
    const slot = document.querySelector('[data-period-boundary]');
    if (!slot) return;
    let timeline=slot.nextElementSibling;
    if(!timeline?.classList.contains('timeline-year-link')) {
      timeline=document.createElement('a');timeline.className='timeline-year-link';
      slot.after(timeline);
    }
    timeline.href='../timeline/#'+new URLSearchParams({period:id,from:year,to:year});
    timeline.textContent='对读本年任期：先后、共治与争位 ↗';
    let comparison=timeline.nextElementSibling;
    if(!comparison?.classList.contains('map-compare-year-link')) {
      comparison=document.createElement('a');comparison.className='map-compare-year-link';
      timeline.after(comparison);
    }
    comparison.href='../map-compare/#'+new URLSearchParams({ap:id,ay:year,bp:id,by:year});
    comparison.textContent='对照本年地图与其他历史阶段 ↗';
    window.FastiPower?.mount('year',id+':'+year,slot.parentElement);
    slot.replaceChildren();
    slot.hidden = true;
    // The Republic reuses its DOM between years; discard stale completions.
    const token = slot.dataset.year = `${id}:${year}`;
    read().then(periods => {
      if (!slot.isConnected || slot.dataset.year !== token) return;
      const index = periods.findIndex(p => p.id === id), current = periods[index];
      if (!current) return;
      const neighbours = [];
      if (year === current.start && index > 0) neighbours.push([periods[index - 1], 'end', '← 上一卷']);
      if (year === current.end && index < periods.length - 1) neighbours.push([periods[index + 1], 'start', '下一卷 →']);
      for (const [period, edge, label] of neighbours) {
        const y = period[edge], key = period.id === 'republic' ? -y : y;
        const link = document.createElement('a');
        link.href = `../${period.id}/#year=${key}`;
        link.textContent = `${label} · ${period.title} · ${when(y)}`;
        slot.append(link);
      }
      slot.hidden = !slot.children.length;
    }).catch(() => { /* The static volume footer remains available offline. */ });
  }
  return {mount};
})();
