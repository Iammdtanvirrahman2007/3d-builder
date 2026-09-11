import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TransformControls.js';

// Capture the active TransformControls instance so the visual UI can operate
// without exposing the editor's internal scene state globally.
const originalAttach=TransformControls.prototype.attach;
TransformControls.prototype.attach=function(object){
  window.__builderTransform=this;
  return originalAttach.call(this,object);
};

const input=document.querySelector('#colorInput');
const swatch=document.querySelector('.color-swatch');
const presets=[...document.querySelectorAll('[data-color]')];

function activeObject(){return window.__builderTransform?.object||null}
function setColor(value){
  const obj=activeObject();
  if(!obj||!obj.material||Array.isArray(obj.material))return;
  obj.material.color.set(value);
  if(input)input.value=value;
  if(swatch)swatch.style.background=value;
}

input?.addEventListener('input',e=>setColor(e.target.value));
presets.forEach(btn=>btn.addEventListener('click',()=>setColor(btn.dataset.color)));

setInterval(()=>{
  const obj=activeObject();
  if(!obj?.material||Array.isArray(obj.material))return;
  const value='#'+obj.material.color.getHexString();
  if(input&&document.activeElement!==input)input.value=value;
  if(swatch)swatch.style.background=value;
},120);
