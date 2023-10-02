import { stripe } from "@/lib/stripe";
import { auth, currentUser } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";


const return_url = process.env.NEXT_BASE_URL + "/";

export async function GET() {
    try {
        const {userId} = await auth()
        const user = await currentUser()
        //check if the user is authenticated
        if (!userId) {
            return new NextResponse("unauthorized", { status: 401 });
          }

        //check if the user is already a subscriber. check the userId in the Drizzle database
        const _userSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

      //if there is a _userSubscriptions[0] and a stripeCustomerId. then the user wants to cancel subscription
      //we then redirect the user to strip billing portal
      if (_userSubscriptions[0] && _userSubscriptions[0].stripeCustomerId) {
        // trying to cancel at the billing portal
        const stripeSession = await stripe.billingPortal.sessions.create({
          customer: _userSubscriptions[0].stripeCustomerId,
          return_url,
        });
        return NextResponse.json({ url: stripeSession.url });
    }


    // user's first time trying to subscribe
    const stripeSession = await stripe.checkout.sessions.create({
        success_url: return_url,
        cancel_url: return_url,
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        customer_email: user?.emailAddresses[0].emailAddress,
        line_items: [
          {
            price_data: {
              currency: "USD",
              product_data: {
                name: "ChatPDF Pro",
                description: "Unlimited PDF sessions!",
              },
              unit_amount: 2000,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
        },
      });
      return NextResponse.json({ url: stripeSession.url });

    } catch (error) {
    console.log("stripe error", error);
    return new NextResponse("internal server error", { status: 500 });
    }
    
}