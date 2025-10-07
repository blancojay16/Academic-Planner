import { Calendar, FileText, Upload, Home, LogOut, Settings, Calculator } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Notes", url: "/notes", icon: FileText },
  { title: "Files", url: "/files", icon: Upload },
  { title: "Grades", url: "/grades", icon: Calculator },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "hover:bg-sidebar-accent/50";

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-72"} border-r bg-sidebar/95 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/80 transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="p-3">
        <div className="mb-6 px-2">
          <div className="flex items-center justify-center h-12 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
            {!collapsed && (
              <span className="text-sm font-bold text-white tracking-wide">
                AP
              </span>
            )}
            {collapsed && (
              <span className="text-xs font-bold text-white">
                A
              </span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium text-xs uppercase tracking-wider mb-3 px-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-md transform scale-[1.02]" 
                            : "hover:bg-sidebar-accent/70 text-sidebar-foreground hover:transform hover:scale-[1.02]"
                        }`
                      }
                    >
                      <item.icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : ''}`} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-6 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="default"
            onClick={handleSignOut}
            className={`w-full justify-start rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200 ${
              collapsed ? 'px-2' : 'px-3'
            }`}
          >
            <LogOut className={`h-5 w-5 ${collapsed ? 'mx-auto' : ''}`} />
            {!collapsed && <span className="ml-3 font-medium">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}