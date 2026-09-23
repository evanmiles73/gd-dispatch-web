import "@neondatabase/auth-ui/css";
import {Providers} from "./providers";
export const metadata={title:"GD Car",description:"GD Car｜車趟管理、派車、司機定位與出車提醒",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"default",title:"GD Car"},formatDetection:{telephone:false}};
export const viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f4f7f3"};
export default function RootLayout({children}){return <html lang="zh-Hant"><body style={{margin:0}}><Providers>{children}</Providers></body></html>}
