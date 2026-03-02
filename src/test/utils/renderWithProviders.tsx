import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { AppStateProvider } from "../../providers/AppStateProvider";
import { Toaster } from "sonner";

/**
 * Custom render function that wraps components with necessary providers.
 * Use this instead of the default `render` from @testing-library/react.
 *
 * @example
 * ```ts
 * import { renderWithProviders } from '../test/utils/renderWithProviders';
 *
 * test('my component', () => {
 *   const { getByText } = renderWithProviders(<MyComponent />);
 *   expect(getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /**
   * Initial app state values (optional)
   */
  initialAppState?: {
    activeTab?: string;
    catalogEditMode?: boolean;
    mobileMenuOpen?: boolean;
    catalogSearchQuery?: string;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialAppState, ...renderOptions } = options;

  // Create a wrapper component with providers
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    // If initialAppState is provided, we'd need to modify AppStateProvider
    // For now, we'll use defaults. Can be enhanced later if needed.
    return (
      <AppStateProvider>
        {children}
        <Toaster />
      </AppStateProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react for convenience
export * from "@testing-library/react";
