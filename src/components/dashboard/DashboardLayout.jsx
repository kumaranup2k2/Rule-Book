import React from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}