import { NextResponse } from 'next/server';
import { getShopifyOrders, getShopifyCustomers, classifyProduct, classifyOrderType } from '@/lib/integrations/shopify';
import { getDatabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const body = await request.json().catch(() => ({}));
    const since = body.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    // 1. Sync Customers
    const customers = await getShopifyCustomers({ since });
    for (const shopifyCustomer of customers) {
      try {
        await db.customer.upsert({
          where: { shopifyCustomerId: String(shopifyCustomer.id) },
          update: {
            email: shopifyCustomer.email,
            firstName: shopifyCustomer.first_name,
            lastName: shopifyCustomer.last_name,
            phone: shopifyCustomer.phone,
            geo: shopifyCustomer.default_address?.province,
            zipCode: shopifyCustomer.default_address?.zip,
          },
          create: {
            shopifyCustomerId: String(shopifyCustomer.id),
            email: shopifyCustomer.email,
            firstName: shopifyCustomer.first_name,
            lastName: shopifyCustomer.last_name,
            phone: shopifyCustomer.phone,
            geo: shopifyCustomer.default_address?.province,
            zipCode: shopifyCustomer.default_address?.zip,
            lifecycleStage: shopifyCustomer.orders_count > 0 ? 'active' : 'lead',
            purchaseDate: shopifyCustomer.orders_count > 0 ? new Date(shopifyCustomer.created_at) : undefined,
            acquisitionDate: new Date(shopifyCustomer.created_at),
          },
        });
        recordsProcessed++;
      } catch (error) {
        console.error(`[SHOPIFY SYNC] Failed to sync customer ${shopifyCustomer.id}:`, error);
        recordsFailed++;
      }
    }

    // 2. Sync Orders
    const orders = await getShopifyOrders({ since });
    for (const order of orders) {
      try {
        const shopifyCustomerId = order.customer?.id ? String(order.customer.id) : null;
        
        // Find or create customer
        let customer = shopifyCustomerId
          ? await db.customer.findUnique({ where: { shopifyCustomerId } })
          : null;

        if (!customer && shopifyCustomerId) {
          customer = await db.customer.create({
            data: {
              shopifyCustomerId,
              email: order.customer?.email,
              firstName: order.customer?.first_name,
              lastName: order.customer?.last_name,
              lifecycleStage: 'active',
              purchaseDate: new Date(order.created_at),
              acquisitionDate: new Date(order.created_at),
            },
          });
        }

        if (!customer) continue;

        // Count previous orders for classification
        const previousOrderCount = await db.shopifyOrder.count({
          where: { customerId: customer.id },
        });

        // Upsert order
        const savedOrder = await db.shopifyOrder.upsert({
          where: { shopifyOrderId: String(order.id) },
          update: {
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            totalPrice: parseFloat(order.total_price),
          },
          create: {
            shopifyOrderId: String(order.id),
            customerId: customer.id,
            orderNumber: order.order_number,
            orderDate: new Date(order.created_at),
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            subtotalPrice: parseFloat(order.subtotal_price),
            totalDiscounts: parseFloat(order.total_discounts),
            totalTax: parseFloat(order.total_tax),
            totalPrice: parseFloat(order.total_price),
            currency: order.currency,
            discountCodes: JSON.stringify(order.discount_codes || []),
            shippingCity: order.shipping_address?.city,
            shippingState: order.shipping_address?.province,
            shippingZip: order.shipping_address?.zip,
            orderType: classifyOrderType(order, previousOrderCount),
            isSubscription: (order.line_items || []).some((li: any) =>
              classifyProduct(li.title, li.sku).includes('subscription')
            ),
          },
        });

        // Sync line items
        for (const lineItem of (order.line_items || [])) {
          await db.shopifyLineItem.create({
            data: {
              orderId: savedOrder.id,
              shopifyLineItemId: String(lineItem.id),
              productTitle: lineItem.title,
              variantTitle: lineItem.variant_title,
              sku: lineItem.sku,
              quantity: lineItem.quantity,
              price: parseFloat(lineItem.price),
              totalDiscount: parseFloat(lineItem.total_discount || '0'),
              productCategory: classifyProduct(lineItem.title, lineItem.sku),
              isRecurring: classifyProduct(lineItem.title, lineItem.sku).includes('subscription'),
            },
          });
        }

        recordsProcessed++;
      } catch (error) {
        console.error(`[SHOPIFY SYNC] Failed to sync order ${order.id}:`, error);
        recordsFailed++;
      }
    }

    // Log sync
    await db.dataSync.create({
      data: {
        source: 'shopify',
        syncType: 'incremental',
        status: recordsFailed > 0 ? 'partial' : 'success',
        startedAt,
        completedAt: new Date(),
        recordsProcessed,
        recordsFailed,
        metadata: JSON.stringify({ customers: customers.length, orders: orders.length }),
      },
    });

    return NextResponse.json({
      success: true,
      customersProcessed: customers.length,
      ordersProcessed: orders.length,
      recordsProcessed,
      recordsFailed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
