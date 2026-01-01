"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SplitPaneEditorProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultLeftWidth?: number; // percentage
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  className?: string;
}

export function SplitPaneEditor({
  leftPane,
  rightPane,
  defaultLeftWidth = 60,
  minLeftWidth = 40,
  maxLeftWidth = 80,
  className,
}: SplitPaneEditorProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
        setLeftWidth(newWidth);
      }
    },
    [isResizing, minLeftWidth, maxLeftWidth]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const toggleRightPane = () => {
    setIsRightPaneCollapsed(!isRightPaneCollapsed);
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex h-full w-full overflow-hidden", className)}
    >
      {/* Left Pane - Writing Area */}
      <div
        className="h-full overflow-auto relative"
        style={{
          width: isRightPaneCollapsed ? "100%" : `${leftWidth}%`,
          transition: isResizing ? "none" : "width 200ms ease",
        }}
      >
        {leftPane}

        {/* Toggle button when right pane is collapsed */}
        {isRightPaneCollapsed && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleRightPane}
            className="fixed right-4 bottom-4 z-50 shadow-lg ai-glow"
            title="Open AI Partner"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      {/* Resize Handle */}
      {!isRightPaneCollapsed && (
        <div
          className={cn(
            "w-1 h-full cursor-col-resize flex-shrink-0 relative group",
            "hover:bg-primary/20 transition-colors",
            isResizing && "bg-primary/30"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div
            className={cn(
              "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border",
              "group-hover:bg-primary transition-colors",
              isResizing && "bg-primary"
            )}
          />
        </div>
      )}

      {/* Right Pane - AI Partner */}
      {!isRightPaneCollapsed && (
        <div
          className="h-full overflow-hidden relative"
          style={{
            width: `${100 - leftWidth}%`,
            transition: isResizing ? "none" : "width 200ms ease",
          }}
        >
          {/* Collapse button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleRightPane}
            className="absolute top-2 right-2 z-10 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            title="Collapse AI Partner"
          >
            <PanelRightClose className="size-4" />
          </Button>
          {rightPane}
        </div>
      )}
    </div>
  );
}

export default SplitPaneEditor;
