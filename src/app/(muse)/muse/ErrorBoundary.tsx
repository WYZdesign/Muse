"use client";
import React from "react";
import { trackError } from "@/lib/errorTracker";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Muse ErrorBoundary:", error, info.componentStack);
    trackError(error, `Muse ErrorBoundary${info.componentStack ? `: ${info.componentStack}` : ""}`);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0612",color:"#f5f0ff",fontFamily:"Inter,system-ui,sans-serif",padding:40,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>⚠</div>
          <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.55)",marginBottom:24,maxWidth:400}}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{padding:"12px 32px",borderRadius:12,background:"linear-gradient(135deg,#FFD700,#FFBF00)",color:"#0a0612",fontSize:14,fontWeight:700,border:"none",cursor:"pointer"}}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
