import React from "react";
import Sidebar from "./sidebar";
import Header from "./header";

export default function Layout({
  children,
  title,
  subtitle,
}) {
  return (
    <div className="d-flex vh-100 overflow-hidden">

      {/* Fixed Sidebar */}
      <div
        className="flex-shrink-0"
        style={{
          width: "260px",
          height: "100vh",
        }}
      >
        <Sidebar />
      </div>

      {/* Right Side */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          height: "100vh",
          minWidth: 0,
        }}
      >

        {/* Fixed Header */}
        <div
          className="flex-shrink-0"
          style={{
            height: "70px",
            zIndex: 1000,
          }}
        >
          <Header
            title={title}
            subtitle={subtitle}
          />
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