  import { Activity } from "lucide-react";
  import { useContext, useEffect, useState } from "react";
  import ConnectionPreview from "./components/ConnectionPreview";
  import Navigation from "./components/Navigation";
  import { Button } from "./components/ui/button";
  import { Sidebar, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
  import { type Connection, ConnectionContext } from "./context/connection.ctx";

  const MainPage = () => {
    const { connections } = useContext(ConnectionContext) || {};
    const [tab, setTab] = useState<"devices" | "connections">("devices");
    const [open, setOpen] = useState(true);
    const [activeConnection, setActiveConnection] = useState<Connection | null>(null);

    useEffect(() => {
      if (tab === "connections" && !connections?.length) {
        setTab("devices");
      }
    }, [connections, tab]);

    useEffect(() => {
      if (activeConnection) {
        setTab("connections");
        setOpen(false);
      }
    }, [activeConnection]);

    useEffect(() => {
      if (!connections?.length) {
        setOpen(true);
      }
    }, [connections]);

    return (
      <SidebarProvider
        open={open}
        onOpenChange={setOpen}
        className="min-h-screen bg-background"
      >
        <Sidebar>
          <Navigation tab={tab} setTab={setTab} setActiveConnection={setActiveConnection} />
        </Sidebar>
        <main id="main-view" className="bg-muted/30 p-6 grow flex flex-col max-w-full overflow-auto">
          <SidebarTrigger />

          <h2 className="text-xl font-semibold mb-4">Connection Preview</h2>
          {!activeConnection ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active connections</p>
                <p className="text-sm mt-2">Connect to a device to see the preview here</p>
                {!open && (
                  <Button onClick={() => setOpen(true)} variant="outline" className="mt-4">
                    Connect to Device
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 grow flex flex-col">
              <ConnectionPreview
                connection={activeConnection}
                setActiveConnection={setActiveConnection}
              />
            </div>
          )}
        </main>
      </SidebarProvider>
    );
  };

  export default MainPage;
