import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/TransformControls.js';

// Connect the appearance panel to the currently selected editor object.
const originalAttach=TransformControls.prototype.attach;
TransformControls.prototype.attach=function(object){
  window.__builderTransform=this;
  return originalAttach.call(this,object);
};

const input=document.querySelector('#colorInput');
const swatch=document.querySelector('.color-swatch');
const colorButton=document.querySelector('#colorButton');
const colorPanel=document.querySelector('#colorPanel');
const closeButton=document.querySelector('#closeColorBtn');
const presets=[...document.querySelectorAll('[data-color]')];

function activeObject(){return window.__builderTransform?.object||null}
function validHex(value){return /^#[0-9a-f]{6}$/i.test(value)}

function setColor(value){
  if(!validHex(value))return;
  const obj=activeObject();
  if(!obj||!obj.material||Array.isArray(obj.material))return;
  obj.material.color.set(value);
  if(input)input.value=value.toUpperCase();
  if(swatch)swatch.style.background=value;
}

function sync(){
  const obj=activeObject();
  if(!obj?.material||Array.isArray(obj.material))return;
  const value='#'+obj.material.color.getHexString();
  if(input&&document.activeElement!==input)input.value=value.toUpperCase();
  if(swatch)swatch.style.background=value;
}

colorButton?.addEventListener('click',()=>{
  if(!activeObject())return;
  colorPanel?.classList.toggle('hidden');
});
closeButton?.addEventListener('click',()=>colorPanel?.classList.add('hidden'));

presets.forEach(btn=>btn.addEventListener('click',()=>setColor(btn.dataset.color)));

input?.addEventListener('input',e=>{
  const value=e.target.value.trim();
  if(validHex(value))setColor(value);
});
input?.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const value=input.value.trim();
    if(validHex(value)){setColor(value);input.blur()}
  }
});

document.addEventListener('pointerdown',e=>{
  if(!colorPanel?.classList.contains('hidden')&&!colorPanel.contains(e.target)&&!colorButton?.contains(e.target)){
    colorPanel.classList.add('hidden');
  }
});

setInterval(sync,120);
