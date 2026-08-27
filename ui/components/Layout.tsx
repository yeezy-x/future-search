import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 280;

const Layout = ({
  children,
  sidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
}) => {
  return (
    <main
      className={cn(
        "min-h-screen bg-[#0A0A0A] transition-[padding] duration-200 ease-out pb-4",
        sidebarOpen ? "lg:pl-[280px]" : "lg:pl-0"
      )}
    >
      <div className="max-w-3xl lg:mx-auto mx-4 pt-14 lg:pt-6">
        {children}
      </div>
    </main>
  );
};

export { SIDEBAR_WIDTH };
export default Layout;
