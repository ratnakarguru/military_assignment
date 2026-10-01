import React from "react";
import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

export default function Layout({
  children,
  title,
  subtitle,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="mams-layout d-flex vh-100 overflow-hidden">

      <div className={`mams-sidebar-shell flex-shrink-0${sidebarOpen ? " is-open" : ""}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {sidebarOpen && (
        <button
          className="mams-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Right Side */}
      <div className="mams-layout-main flex-grow-1 d-flex flex-column">

        {/* Fixed Header */}
        <div className="mams-layout-header flex-shrink-0">
          <Header title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        </div>

        {/* Only this area scrolls */}
        <main
          className="flex-grow-1 overflow-auto bg-light"
        >
          {children}
        </main>

      </div>

    </div>
  );
}