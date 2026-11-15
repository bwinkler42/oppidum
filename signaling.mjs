// The first byte carries the SDP type so either step can reject a swapped code.
export async function encode(desc){
  if(typeof CompressionStream==='undefined')return btoa(JSON.stringify({type:desc.type,sdp:desc.sdp}));
  const type=desc.type==='offer'?'o':'a';
  const stream=new Blob([type+desc.sdp]).stream().pipeThrough(new CompressionStream('deflate'));
  const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
  return 'OP3.'+btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function decode(code,type){
  const compact=code.replace(/\s/g,'');
  if(compact.length>65536)throw Error('Der Code ist zu lang.');
  let desc;
  if(compact.startsWith('OP3.')){
    const bytes=Uint8Array.from(atob(compact.slice(4).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const decoder=new TextDecoder();
    let size=0,text='';
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        size+=value.byteLength;
        if(size>65536)throw Error('Der Code ist zu lang.');
        text+=decoder.decode(value,{stream:true});
      }
      text+=decoder.decode();
    }finally{await reader.cancel();}
    desc={type:{o:'offer',a:'answer'}[text[0]],sdp:text.slice(1)};
  }else{
    desc=JSON.parse(atob(compact));
  }
  if(desc?.type!==type||typeof desc.sdp!=='string')throw Error('Der Code passt nicht zu diesem Schritt.');
  return desc;
}
