import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/api-middleware";

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const { shopId } = body;

  if (!shopId) {
    return NextResponse.json(
      { error: "shopId is required" },
      { status: 400 }
    );
  }

  // Verify the merchant owns this shop
  const shopDoc = await adminDb.collection("shops").doc(shopId).get();
  const shopData = shopDoc.data();

  if (!shopDoc.exists || shopData?.ownerId !== auth.userId) {
    return NextResponse.json(
      { error: "Shop not found or unauthorized" },
      { status: 403 }
    );
  }

  const accountId = shopData?.stripeAccountId;
  if (!accountId) {
    return NextResponse.json(
      { error: "Stripe account not configured. Please complete onboarding first." },
      { status: 400 }
    );
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId);

  return NextResponse.json({
    url: loginLink.url,
  });
}, { requiredRole: "merchant" });
