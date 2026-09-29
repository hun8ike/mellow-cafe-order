import Link from "next/link";
import "./globals.css";

export const metadata = { title: "Mellow Café", description: "สั่งเครื่องดื่มออนไลน์" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header>
          <h1>Mellow Café</h1>
          <nav>
            <Link href="/">สั่งเครื่องดื่ม</Link>
            <Link href="/staff">พนักงาน</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
