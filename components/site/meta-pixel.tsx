import { validPixelId } from "@/lib/meta";

import { MetaPixelLoader } from "./meta-pixel-loader";

// The browser half of Meta tracking, on the store only and only while switched on. This small stub
// queues events until Meta's script arrives (meta-pixel-loader.tsx). Its automatic features stay
// off: autoConfig would read the page, and following page changes would report an order's private
// address, so every event is sent on purpose by lib/meta-client.ts. An fbclid from an ad is kept
// in Meta's own _fbc cookie, so a sale can be tied back to the click.
const setup = (id: string) => `(function(){
var f=window.fbq=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments)};
window._fbq=f;f.push=f;f.loaded=true;f.version="2.0";f.queue=[];f.disablePushState=true;
f("set","autoConfig",false,"${id}");f("init","${id}");
var c=new URLSearchParams(location.search).get("fbclid");
if(c&&/^[\\w.-]+$/.test(c)&&!new RegExp("(?:^|; )_fbc=[^;]*\\\\."+c.replace(/\\./g,"\\\\.")+"(?:;|$)").test(document.cookie)){
document.cookie="_fbc=fb.1."+Date.now()+"."+c+"; Max-Age=7776000; Path=/; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"")}
})();`;

export function MetaPixel({ pixelId }: { pixelId: string }) {
  if (!validPixelId(pixelId)) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: setup(pixelId) }} />
      <MetaPixelLoader />
    </>
  );
}
