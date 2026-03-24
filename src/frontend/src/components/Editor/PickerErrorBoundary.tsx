"use client";

import React from "react";

interface PickerErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface PickerErrorBoundaryState {
  hasError: boolean;
}

export class PickerErrorBoundary extends React.Component<PickerErrorBoundaryProps, PickerErrorBoundaryState> {
  state: PickerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep the failure scoped to the drawer instead of crashing the route.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
