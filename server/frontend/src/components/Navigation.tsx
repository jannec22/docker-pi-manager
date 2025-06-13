import { AuthContext } from "@/context/auth.ctx";
import { type Connection, ConnectionContext } from "@/context/connection.ctx";
import { trpc } from "@/utils/trpc";
import { Activity, ChevronLeft, ChevronRight, MoreVertical, Wifi } from "lucide-react";
import { type Dispatch, type SetStateAction, useContext, useState } from "react";
import ConnectionList from "./ConnectionList";
import DeviceList from "./DeviceList";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "./ui/pagination";
import { SidebarContent, SidebarHeader } from "./ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface Props {
  tab: "devices" | "connections";
  setTab: Dispatch<SetStateAction<"devices" | "connections">>;
  setActiveConnection: Dispatch<SetStateAction<Connection | null>>;
}

const Navigation = ({ tab, setTab, setActiveConnection }: Props) => {
  const { logout } = useContext(AuthContext) || {};
  const { connections } = useContext(ConnectionContext) || {};

  const [page, setPage] = useState(0);
  const pageSize = 5;

  const { data, isLoading } = trpc.admin.device.list.useQuery({
    page,
    pageSize,
  });

  return (
    <>
      <SidebarHeader className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl font-bold text-foreground mb-2">Device Manager</h1>

          <div className="flex">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => logout?.()}>
                  <span className="text-sm">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="text-muted-foreground">Manage Raspberry Pi devices</p>
      </SidebarHeader>

      <SidebarContent className="p-4 space-y-4">
        <Tabs
          value={tab}
          onValueChange={v => {
            setTab(v as "devices" | "connections");
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="devices" className="flex items-center gap-2 text-xs">
              <Wifi className="h-3 w-3" />
              Devices ({data?.total ?? "--"})
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2 text-xs">
              <Activity className="h-3 w-3" />
              Active ({connections?.length ?? "--"})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Activity className="h-8 w-8 animate-spin" />
              </div>
            )}

            <DeviceList setActiveConnection={setActiveConnection} devices={data?.items ?? []} />

            {!!data?.total && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                  {Array.from({ length: Math.ceil((data?.total ?? 0) / pageSize) }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        size="icon"
                        href="#"
                        isActive={i === page}
                        onClick={() => setPage(i)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={page >= Math.ceil((data?.total ?? 0) / pageSize) - 1}
                      onClick={() =>
                        setPage(prev =>
                          Math.min(prev + 1, Math.ceil((data?.total ?? 0) / pageSize) - 1),
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <ConnectionList setActive={setActiveConnection} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </>
  );
};

export default Navigation;
