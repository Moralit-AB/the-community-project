import { getCurrentUser } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
