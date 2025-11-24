import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/api-middleware";

export const POST = withAuth(async (request: NextRequest, auth) => {
  // Get driver user document
  const userDoc = await adminDb.collection("users").doc(auth.userId).get();
  const userData = userDoc.data();

  if (!userDoc.exists || !userData) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const accountId = userData.stripeAccountId;
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
}, { requiredRole: "driver" });
