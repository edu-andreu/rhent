import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface TabErrorBoundaryProps {
  children: ReactNode;
  tabName: string;
  onReset?: () => void;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TabErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error });
    console.error(`Error in ${this.props.tabName} tab:`, error, errorInfo);
  }

  componentDidUpdate(prevProps: TabErrorBoundaryProps) {
    // Reset error when switching tabs
    if (prevProps.tabName !== this.props.tabName && this.state.hasError) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle>Error loading {this.props.tabName}</CardTitle>
              </div>
              <CardDescription>
                Something went wrong while loading this section. You can try again or switch to
                another tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-4 rounded-md bg-muted p-3 text-sm">
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
              <Button onClick={this.resetErrorBoundary} variant="default" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
