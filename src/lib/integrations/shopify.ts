/**
 * Shopify Integration for FunnelAI
 * Pulls orders, subscriptions, customers, and payment data from Shopify.
 * 
 * Authentication: Shopify Admin API access token
 * API Base: https://{store}.myshopify.com/admin/api/2024-10
 */

function getShopifyCredentials() {
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g., "signos-inc.myshopify.com"
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';

  if (!accessToken || !storeDomain) return null;
  return { accessToken, storeDomain, apiVersion };
}

async function shopifyRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const creds = getShopifyCredentials();
  if (!creds) throw new Error('Shopify credentials not configured');

  const url = `https://${creds.storeDomain}/admin/api/${creds.apiVersion}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': creds.accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SHOPIFY] API error at ${endpoint}:`, response.status, errorText);
    throw new Error(`Shopify API error: ${response.status}`);
  }

  return response.json();
}

export async function testShopifyConnection(): Promise<{
  success: boolean;
  error?: string;
  shopName?: string;
}> {
  try {
    const creds = getShopifyCredentials();
    if (!creds) {
      return { success: false, error: 'Shopify credentials not configured. Set SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN.' };
    }

    const data = await shopifyRequest('/shop.json');
    return { success: true, shopName: data.shop?.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getShopifyOrders(params: {
  since?: string;
  status?: string;
  limit?: number;
} = {}): Promise<Array<{
  id: number;
  order_number: number;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  total_price: string;
  currency: string;
  customer: any;
  line_items: any[];
  discount_codes: any[];
  shipping_address: any;
}>> {
  try {
    const queryParams = new URLSearchParams();
    if (params.since) queryParams.append('created_at_min', params.since);
    queryParams.append('status', params.status || 'any');
    queryParams.append('limit', String(params.limit || 250));

    const data = await shopifyRequest(`/orders.json?${queryParams.toString()}`);
    return data.orders || [];
  } catch (error) {
    console.error('[SHOPIFY] Failed to fetch orders:', error);
    return [];
  }
}

export async function getShopifyCustomers(params: {
  since?: string;
  limit?: number;
} = {}): Promise<any[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params.since) queryParams.append('created_at_min', params.since);
    queryParams.append('limit', String(params.limit || 250));

    const data = await shopifyRequest(`/customers.json?${queryParams.toString()}`);
    return data.customers || [];
  } catch (error) {
    console.error('[SHOPIFY] Failed to fetch customers:', error);
    return [];
  }
}

export async function getShopifyCustomerOrders(customerId: string): Promise<any[]> {
  try {
    const data = await shopifyRequest(`/customers/${customerId}/orders.json`);
    return data.orders || [];
  } catch (error) {
    console.error(`[SHOPIFY] Failed to fetch orders for customer ${customerId}:`, error);
    return [];
  }
}

export async function getShopifyProducts(): Promise<any[]> {
  try {
    const data = await shopifyRequest('/products.json?limit=250');
    return data.products || [];
  } catch (error) {
    console.error('[SHOPIFY] Failed to fetch products:', error);
    return [];
  }
}

export function isShopifyConfigured(): boolean {
  return getShopifyCredentials() !== null;
}

// Helper to classify a Shopify product into our categories
export function classifyProduct(title: string, sku: string | null): string {
  const t = (title || '').toLowerCase();
  const s = (sku || '').toLowerCase();
  
  if (t.includes('glp-1') || t.includes('semaglutide') || t.includes('tirzepatide') || s.includes('glp1')) return 'glp1_medication';
  if (t.includes('nausea') || s.includes('nausea')) return 'supplement_nausea';
  if (t.includes('digestive') || s.includes('digestive')) return 'supplement_digestive';
  if (t.includes('metabolic') && t.includes('supplement')) return 'supplement_metabolic';
  if (t.includes('lab') || t.includes('hba1c') || t.includes('panel')) return 'lab_kit';
  if (t.includes('coaching') || t.includes('coach')) return 'coaching';
  if (t.includes('cgm') || t.includes('sensor') || t.includes('continuous glucose')) return 'cgm_hardware';
  if (t.includes('subscription') || t.includes('plan') || t.includes('month')) return 'cgm_subscription';
  if (t.includes('sustain')) return 'sustain_subscription';
  return 'other';
}

// Helper to determine order type
export function classifyOrderType(order: any, previousOrders: number): string {
  if (previousOrders === 0) return 'initial_purchase';
  
  const lineItems = order.line_items || [];
  const hasSubscription = lineItems.some((li: any) => 
    classifyProduct(li.title, li.sku).includes('subscription')
  );
  
  if (hasSubscription) return 'renewal';
  
  const hasAddOn = lineItems.some((li: any) => {
    const cat = classifyProduct(li.title, li.sku);
    return cat.includes('supplement') || cat.includes('lab') || cat.includes('coaching');
  });
  
  if (hasAddOn) return 'addon';
  
  return 'upsell';
}
