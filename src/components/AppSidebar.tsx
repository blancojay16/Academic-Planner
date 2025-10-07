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
      className={`${collapsed ? "w-16" : "w-72"} border-r border-border/50 bg-sidebar shadow-xl transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="p-4">
        <div className="mb-8 px-2">
          <div className="flex items-center justify-center h-14 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent shadow-elevated">
            {!collapsed && (
              <span className="text-lg font-bold text-white tracking-wider">
                StudyHub
              </span>
            )}
            {collapsed && (
              <span className="text-sm font-bold text-white">
                SH
              </span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold text-xs uppercase tracking-wider mb-4 px-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${
                          isActive 
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 scale-[1.02]" 
                            : "text-sidebar-foreground hover:bg-gradient-ocean hover:text-primary hover:shadow-md hover:scale-[1.01]"
                        }`
                      }
                    >
                      <item.icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : ''}`} strokeWidth={2.5} />
                      {!collapsed && <span className="text-[15px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-6 border-t border-border/50">
          <Button
            variant="ghost"
            size="default"
            onClick={handleSignOut}
            className={`w-full justify-start rounded-2xl hover:bg-destructive/10 hover:text-destructive font-medium transition-all duration-300 ${
              collapsed ? 'px-2' : 'px-4'
            }`}
          >
            <LogOut className={`h-5 w-5 ${collapsed ? 'mx-auto' : ''}`} strokeWidth={2.5} />
            {!collapsed && <span className="ml-4 text-[15px]">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}