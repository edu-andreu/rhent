/**
 * DrawerTestPanel - Developer Tool for API Testing
 * 
 * This component is only visible when ?debug=true is in the URL.
 * It provides direct API testing for cash drawer endpoints without
 * going through the main UI workflows.
 * 
 * Usage: Add ?debug=true to your URL to enable this panel
 * Example: http://localhost:5173/?debug=true
 */

import { useState } from 'react';
import { supabaseConfig, buildFunctionUrl } from '../shared/config/env';

const BASE_URL = supabaseConfig.functionsBaseUrl();

export function DrawerTestPanel() {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, data: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const status = data.status >= 200 && data.status < 300 ? '✅' : '❌';
    const formatted = `${status} [${timestamp}] ${test}\n${JSON.stringify(data, null, 2)}\n\n`;
    setResults((prev) => formatted + prev);
  };

  const apiCall = async (endpoint: string, method: string, body?: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${supabaseConfig.publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      addResult(`${method} ${endpoint}`, {
        status: response.status,
        data,
      });
      return data;
    } catch (error) {
      addResult(`${method} ${endpoint}`, { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const tests = [
    {
      name: '1. Open Drawer',
      action: () => apiCall('/drawer/open', 'POST', {
        openingCash: 50000,
        location: 'Test Store',
        openedBy: 'Test User',
      }),
    },
    {
      name: '2. Try Open Again (Should Fail)',
      action: () => apiCall('/drawer/open', 'POST', {
        openingCash: 30000,
        location: 'Test Store',
        openedBy: 'Test User',
      }),
    },
    {
      name: '3. Get Current Drawer',
      action: () => apiCall('/drawer/current', 'GET'),
    },
    {
      name: '4. Close Drawer',
      action: () => apiCall('/drawer/close', 'POST', {
        countedCash: 50000,
        closedBy: 'Test User',
        notes: 'Test closing',
      }),
    },
    {
      name: '5. Get History',
      action: () => apiCall('/drawer/history?limit=5&offset=0', 'GET'),
    },
    {
      name: '6. Checkout (No Drawer)',
      action: () => apiCall('/checkout', 'POST', {
        customerId: '11111111-1111-1111-1111-111111111111',
        customerName: 'Test Customer',
        cartItems: [{
          itemId: '22222222-2222-2222-2222-222222222222',
          dressName: 'Test Dress',
          startDate: '2026-02-12',
          endDate: '2026-02-15',
          amount: 10000,
          extraDays: 0,
          extraDaysAmount: 0,
          discount: 0,
        }],
        payments: [{
          amount: 10000,
          methodName: 'Cash',
        }],
        discount: 0,
        notes: 'Test checkout without drawer',
      }),
    },
    {
      name: '7. Checkout (With Drawer)',
      action: () => apiCall('/checkout', 'POST', {
        customerId: '11111111-1111-1111-1111-111111111111',
        customerName: 'Test Customer',
        cartItems: [{
          itemId: '22222222-2222-2222-2222-222222222222',
          dressName: 'Test Dress',
          startDate: '2026-02-12',
          endDate: '2026-02-15',
          amount: 10000,
          extraDays: 0,
          extraDaysAmount: 0,
          discount: 0,
        }],
        payments: [{
          amount: 10000,
          methodName: 'Cash',
        }],
        discount: 0,
        notes: 'Test checkout WITH drawer',
      }),
    },
    {
      name: '8. Get Current (After Checkout)',
      action: () => apiCall('/drawer/current', 'GET'),
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 rounded-t-lg">
        <h3 className="font-bold text-lg">🧪 Drawer API Test Panel</h3>
        <p className="text-xs text-gray-300 mt-1">Quick backend testing</p>
      </div>

      {/* Test Buttons */}
      <div className="p-4 border-b border-gray-200 space-y-2 overflow-y-auto max-h-48">
        <div className="grid grid-cols-2 gap-2">
          {tests.map((test, index) => (
            <button
              key={index}
              onClick={test.action}
              disabled={loading}
              className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {test.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setResults('')}
          className="w-full px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
        >
          Clear Results
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-b-lg">
        {loading && (
          <div className="text-yellow-400 mb-2">⏳ Loading...</div>
        )}
        {results ? (
          <pre className="whitespace-pre-wrap">{results}</pre>
        ) : (
          <div className="text-gray-500">Click a test button to see results...</div>
        )}
      </div>
    </div>
  );
}
