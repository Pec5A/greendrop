import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const { shopId, userId, driverId } = paymentIntent.metadata;

      // Find the order with this paymentIntentId and update it
      const ordersSnapshot = await adminDb
        .collection("orders")
        .where("paymentIntentId", "==", paymentIntent.id)
        .limit(1)
        .get();

      if (!ordersSnapshot.empty) {
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        await orderDoc.ref.update({
          paymentStatus: "paid",
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`Order ${orderDoc.id} payment succeeded`);

        // Transfer delivery fee to driver if assigned and has Stripe account
        const effectiveDriverId = driverId || orderData?.driverId;
        if (effectiveDriverId && orderData?.deliveryFee) {
          try {
            const driverDoc = await adminDb.collection("users").doc(effectiveDriverId).get();
            const driverData = driverDoc.data();

            if (driverData?.stripeAccountId) {
              const deliveryFeeInCents = Math.round((orderData.deliveryFee || 0) * 100);

              if (deliveryFeeInCents > 0) {
                const transfer = await stripe.transfers.create({
                  amount: deliveryFeeInCents,
                  currency: "eur",
                  destination: driverData.stripeAccountId,
                  source_transaction: paymentIntent.latest_charge as string,
                  metadata: {
                    orderId: orderDoc.id,
                    driverId: effectiveDriverId,
                    type: "driver_delivery_fee",
                  },
                });

                await orderDoc.ref.update({
                  driverTransferId: transfer.id,
                  driverPaidAt: FieldValue.serverTimestamp(),
                });
                console.log(`Driver ${effectiveDriverId} transfer ${transfer.id} created: ${deliveryFeeInCents} cents`);
              }
            } else {
              console.log(`Driver ${effectiveDriverId} has no Stripe account, skipping transfer`);
            }
          } catch (transferError) {
            console.error(`Failed to transfer to driver ${effectiveDriverId}:`, transferError);
            const errorMessage = transferError instanceof Error ? transferError.message : "Unknown error";
            await orderDoc.ref.update({
              driverTransferError: errorMessage,
              driverTransferFailedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      } else {
        console.log(`Payment succeeded for PI ${paymentIntent.id} - no matching order yet (userId: ${userId}, shopId: ${shopId})`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;

      const ordersSnapshot = await adminDb
        .collection("orders")
        .where("paymentIntentId", "==", paymentIntent.id)
        .limit(1)
        .get();

      if (!ordersSnapshot.empty) {
        const orderDoc = ordersSnapshot.docs[0];
        await orderDoc.ref.update({
          paymentStatus: "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`Order ${orderDoc.id} payment failed`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
