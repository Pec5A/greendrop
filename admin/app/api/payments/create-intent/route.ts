import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/api-middleware";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const { amount, currency = "eur", shopId, driverId, useSavedCard = false } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  // Get or create Stripe customer for this user
  const userDoc = await adminDb.collection("users").doc(auth.userId).get();
  const userData = userDoc.data();
  let customerId = userData?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email,
      name: userData?.name,
      metadata: { firebaseUid: auth.userId },
    });
    customerId = customer.id;

    await adminDb.collection("users").doc(auth.userId).update({
      stripeCustomerId: customerId,
    });
  }

  // Create ephemeral key for mobile SDK
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2023-10-16" }
  );

  // Build PaymentIntent params
  const amountInCents = Math.round(amount * 100);
  const paymentIntentParams: Record<string, unknown> = {
    amount: amountInCents,
    currency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
    metadata: {
      shopId: shopId || "",
      userId: auth.userId,
      driverId: driverId || "",
    },
  };

  // If the shop has a Stripe Connect account, set up transfer
  if (shopId) {
    const shopDoc = await adminDb.collection("shops").doc(shopId).get();
    const shopData = shopDoc.data();

    if (shopData?.stripeAccountId) {
      const merchantAmount = Math.round(amountInCents * 0.85); // 85% to merchant
      paymentIntentParams.transfer_data = {
        amount: merchantAmount,
        destination: shopData.stripeAccountId,
      };
    }
  }

  // If useSavedCard, attach the customer's default payment method and confirm server-side
  if (useSavedCard) {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length > 0) {
      paymentIntentParams.payment_method = paymentMethods.data[0].id;
      paymentIntentParams.confirm = true;
      paymentIntentParams.off_session = true;
      delete paymentIntentParams.setup_future_usage;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(
    paymentIntentParams as unknown as Parameters<typeof stripe.paymentIntents.create>[0]
  );

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
    paymentIntentId: paymentIntent.id,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    paymentStatus: paymentIntent.status,
  });
});
