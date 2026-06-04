(function(){
  function closestButton(node){
    return node && node.closest ? node.closest('button') : null;
  }

  function fixTaskToggle(event){
    var btn = closestButton(event.target);
    if(!btn) return;

    var label = (btn.textContent || '').replace(/\s+/g,' ').trim();
    var handler = btn.getAttribute('onclick') || '';
    if(label.indexOf('Ver tarefas') === -1 && handler.indexOf('toggleListaRow') === -1) return;

    var row = btn.closest('tr');
    var details = row && row.nextElementSibling;
    if(!details || !details.id || details.id.indexOf('lista-expand-') !== 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    details.style.display = details.style.display === 'table-row' ? 'none' : 'table-row';
  }

  function labelIconButtons(root){
    var scope = root || document;
    var viewButtons = scope.querySelectorAll ? scope.querySelectorAll('.view-btn') : [];
    for(var i=0;i<viewButtons.length;i++){
      var btn = viewButtons[i];
      if(btn.getAttribute('aria-label')) continue;
      var siblings = btn.parentElement ? Array.prototype.slice.call(btn.parentElement.children) : [];
      var idx = siblings.indexOf(btn);
      var label = idx === 0 ? 'Kanban' : 'Lista';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  document.addEventListener('click', fixTaskToggle, true);
  document.addEventListener('DOMContentLoaded', function(){ labelIconButtons(document); });

  var observer = new MutationObserver(function(records){
    records.forEach(function(record){
      for(var i=0;i<record.addedNodes.length;i++){
        var node = record.addedNodes[i];
        if(node.nodeType === 1) labelIconButtons(node);
      }
    });
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
