import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/api-middleware";

/**
 * Validates IBAN format and checksum (MOD97 algorithm)
 */
function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;
  // Validation checksum MOD97
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numericIBAN = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  return BigInt(numericIBAN) % 97n === 1n;
}

export const POST = withAuth(async (request: NextRequest, auth) => {
  const body = await request.json();
  const { shopId, firstName, lastName, phone, address, city, postalCode, iban } = body;

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

  // Create or retrieve Stripe Connect Express account
  let accountId = shopData?.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: shopData?.contactEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      individual: {
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        ...(phone && { phone }),
        ...(address && {
          address: {
            line1: address,
            city: city || "",
            postal_code: postalCode || "",
            country: "FR",
          },
        }),
      },
      metadata: {
        shopId,
        firebaseUid: auth.userId,
        role: "merchant",
      },
    });

    accountId = account.id;

    // If IBAN provided, validate and create external account
    if (iban) {
      if (!isValidIBAN(iban)) {
        // Rollback: delete the Stripe account we just created
        await stripe.accounts.del(accountId);
        return NextResponse.json(
          { error: "IBAN invalide" },
          { status: 400 }
        );
      }

      try {
        await stripe.accounts.createExternalAccount(accountId, {
          external_account: {
            object: "bank_account",
            country: "FR",
            currency: "eur",
            account_number: iban,
          },
        });
      } catch (bankError) {
        // Rollback: delete the Stripe account since IBAN failed
        await stripe.accounts.del(accountId);
        const message = bankError instanceof Error ? bankError.message : "Erreur IBAN";
        return NextResponse.json(
          { error: `Erreur IBAN: ${message}` },
          { status: 400 }
        );
      }
    }

    await adminDb.collection("shops").doc(shopId).update({
      stripeAccountId: accountId,
    });
  }

  // Create onboarding link
  const origin = request.headers.get("origin") || "https://greendrop.app";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/merchant/stripe-refresh`,
    return_url: `${origin}/merchant/stripe-complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({
    url: accountLink.url,
    accountId,
  });
}, { requiredRole: "merchant" });
